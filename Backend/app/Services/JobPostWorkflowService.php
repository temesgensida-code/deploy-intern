<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\JobStatus;
use App\Jobs\AnalyzeJobPostMatchesJob;
use App\Models\JobPost;
use App\Notifications\V1\Employer\JobPostApprovedNotification;
use App\Notifications\V1\Employer\JobPostRejectedNotification;
use InvalidArgumentException;

class JobPostWorkflowService
{
    public function __construct(
        protected ?AdminNotificationService $adminNotificationService = null
    ) {
        $this->adminNotificationService ??= app(AdminNotificationService::class);
    }

    /**
     * Submit a draft, rejected, closed, expired, pending, or published job post for admin review.
     */
    public function submitForReview(JobPost $job): JobPost
    {
        if (! in_array($job->status, [
            JobStatus::DRAFT,
            JobStatus::REJECTED,
            JobStatus::CLOSED,
            JobStatus::EXPIRED,
            JobStatus::PENDING_APPROVAL,
            JobStatus::PUBLISHED,
        ], true)) {
            throw new InvalidArgumentException("Cannot submit job post in state '{$job->status->value}'. Only draft, rejected, closed, expired, pending, or published posts can be submitted.");
        }

        $job->update([
            'status' => JobStatus::PENDING_APPROVAL,
            'rejection_reason' => null,
        ]);

        $this->adminNotificationService->notifyJobSubmittedForReview($job);

        return $job;
    }

    /**
     * Approve a pending job post and publish it.
     */
    public function approve(JobPost $job, int $expirationDays = 30): JobPost
    {
        if ($job->status !== JobStatus::PENDING_APPROVAL) {
            throw new InvalidArgumentException("Cannot approve job post in state '{$job->status->value}'. Only pending posts can be approved.");
        }

        $job->update([
            'status' => JobStatus::PUBLISHED,
            'published_at' => now(),
            'expires_at' => now()->addDays($expirationDays),
            'rejection_reason' => null,
        ]);

        $employerUser = $job->employer?->user;
        if ($employerUser) {
            $employerUser->notify(new JobPostApprovedNotification($job));
        }

        // Immediately trigger background task to analyze job matches for candidate profiles
        AnalyzeJobPostMatchesJob::dispatch($job);

        return $job;
    }

    /**
     * Reject a pending job post with a reason.
     */
    public function reject(JobPost $job, string $reason): JobPost
    {
        if ($job->status !== JobStatus::PENDING_APPROVAL) {
            throw new InvalidArgumentException("Cannot reject job post in state '{$job->status->value}'. Only pending posts can be rejected.");
        }

        $job->update([
            'status' => JobStatus::REJECTED,
            'rejection_reason' => $reason,
        ]);

        $employerUser = $job->employer?->user;
        if ($employerUser) {
            $employerUser->notify(new JobPostRejectedNotification($job, $reason));
        }

        return $job;
    }

    /**
     * Close a published job post.
     */
    public function close(JobPost $job): JobPost
    {
        if ($job->status !== JobStatus::PUBLISHED) {
            throw new InvalidArgumentException("Cannot close job post in state '{$job->status->value}'. Only published posts can be closed.");
        }

        $job->update([
            'status' => JobStatus::CLOSED,
        ]);

        return $job;
    }

    /**
     * Reopen a closed job post.
     */
    public function reopen(JobPost $job): JobPost
    {
        if (! in_array($job->status, [JobStatus::CLOSED, JobStatus::EXPIRED], true)) {
            throw new InvalidArgumentException("Cannot reopen job post in state '{$job->status->value}'. Only closed or expired posts can be reopened.");
        }

        $job->update([
            'status' => JobStatus::PUBLISHED,
            'published_at' => now(),
            'expires_at' => now()->addDays(30),
            'rejection_reason' => null,
        ]);

        // Re-trigger job matching analysis
        AnalyzeJobPostMatchesJob::dispatch($job);

        return $job;
    }
}
