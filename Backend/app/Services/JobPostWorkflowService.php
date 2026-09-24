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
     * Submit a draft or rejected job post for admin review.
     */
    public function submitForReview(JobPost $job): JobPost
    {
        if (! in_array($job->status, [
            JobStatus::DRAFT,
            JobStatus::REJECTED,
            JobStatus::CLOSED,
            JobStatus::EXPIRED,
            JobStatus::PENDING_APPROVAL,
        ], true)) {
            throw new InvalidArgumentException("Cannot submit job post in state '{$job->status->value}'. Only draft, rejected, closed, expired, or pending posts can be submitted.");
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
        if ($job->status !== JobStatus::CLOSED) {
            throw new InvalidArgumentException("Cannot reopen job post in state '{$job->status->value}'. Only closed posts can be reopened.");
        }

        $job->update([
            'status' => JobStatus::PUBLISHED,
        ]);

        return $job;
    }

    /**
     * Automatically mark expired published job posts.
     */
    public function expireOverdueJobs(): int
    {
        return JobPost::where('status', JobStatus::PUBLISHED)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->update([
                'status' => JobStatus::EXPIRED,
            ]);
    }
}
