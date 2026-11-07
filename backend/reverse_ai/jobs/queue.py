"""
FAMONEMEDIA Reverse AI - Background Job Queue & Lifecycle Manager
Non-blocking execution of long-running multi-stage AI video analyses
with thread-safe progress reporting, cancellation flags, and in-memory + disk logs.
"""

from __future__ import annotations
import threading
import uuid
from datetime import datetime
from typing import Dict, Optional, Callable, Any
from concurrent.futures import ThreadPoolExecutor
from backend.app.config import settings
from backend.reverse_ai.reconstruction.models import JobStatus


class JobManager:
    def __init__(self, max_workers: int = settings.MAX_CONCURRENT_JOBS):
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="ReverseAIWorker")
        self._jobs: Dict[str, JobStatus] = {}
        self._cancel_flags: Dict[str, threading.Event] = {}
        self._lock = threading.Lock()

    def create_job(self, project_id: str) -> JobStatus:
        with self._lock:
            job_id = f"job_{uuid.uuid4().hex[:12]}"
            status = JobStatus(
                id=job_id,
                project_id=project_id,
                status="pending",
                progress=0,
                current_stage=0,
                stage_name="Initialized",
                logs=[f"[{datetime.utcnow().strftime('%H:%M:%S')}] Job created for project {project_id}"],
            )
            self._jobs[job_id] = status
            self._cancel_flags[job_id] = threading.Event()
            return status

    def get_job(self, job_id: str) -> Optional[JobStatus]:
        with self._lock:
            return self._jobs.get(job_id)

    def is_cancelled(self, job_id: str) -> bool:
        flag = self._cancel_flags.get(job_id)
        return flag.is_set() if flag else False

    def cancel_job(self, job_id: str) -> bool:
        with self._lock:
            if job_id in self._cancel_flags:
                self._cancel_flags[job_id].set()
                if job_id in self._jobs:
                    self._jobs[job_id].status = "cancelled"
                    self._jobs[job_id].logs.append(
                        f"[{datetime.utcnow().strftime('%H:%M:%S')}] Cancellation requested by user."
                    )
                return True
            return False

    def update_progress(
        self,
        job_id: str,
        stage: int,
        stage_name: str,
        progress: int,
        log_message: Optional[str] = None,
    ) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job or job.status == "cancelled":
                return
            job.current_stage = stage
            job.stage_name = stage_name
            job.progress = max(0, min(100, progress))
            if log_message:
                timestamp = datetime.utcnow().strftime("%H:%M:%S")
                job.logs.append(f"[{timestamp}] Stage {stage}/10: {log_message}")

    def start_job(
        self,
        job_id: str,
        target_fn: Callable[..., Any],
        *args: Any,
        **kwargs: Any,
    ) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job.status = "running"
            job.started_at = datetime.utcnow().isoformat()

        def _worker_wrapper():
            try:
                target_fn(job_id, *args, **kwargs)
                with self._lock:
                    if self._jobs[job_id].status != "cancelled":
                        self._jobs[job_id].status = "completed"
                        self._jobs[job_id].progress = 100
                        self._jobs[job_id].stage_name = "Analysis Complete"
                        self._jobs[job_id].completed_at = datetime.utcnow().isoformat()
                        self._jobs[job_id].logs.append(
                            f"[{datetime.utcnow().strftime('%H:%M:%S')}] Workflow finished successfully."
                        )
            except Exception as e:
                with self._lock:
                    self._jobs[job_id].status = "failed"
                    self._jobs[job_id].error_message = str(e)
                    self._jobs[job_id].completed_at = datetime.utcnow().isoformat()
                    self._jobs[job_id].logs.append(
                        f"[{datetime.utcnow().strftime('%H:%M:%S')}] ERROR: {str(e)}"
                    )

        self.executor.submit(_worker_wrapper)


job_manager = JobManager()
