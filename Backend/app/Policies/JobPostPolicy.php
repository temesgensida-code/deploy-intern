<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\JobStatus;
use App\Enums\UserRole;
use App\Models\JobPost;
use App\Models\User;

class JobPostPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(?User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the specific job post.
     */
    public function view(?User $user, JobPost $jobPost): bool
    {
        if ($jobPost->status === JobStatus::PUBLISHED) {
            return true;
        }

        if ($user === null) {
            return false;
        }

        if ($user->role === UserRole::ADMIN) {
            return true;
        }

        if ($user->role === UserRole::EMPLOYER && $user->employer !== null) {
            return $user->employer->id === $jobPost->employer_id;
        }

        return false;
    }

    /**
     * Determine whether the user can create job posts.
     */
    public function create(User $user): bool
    {
        return $user->role === UserRole::EMPLOYER && $user->employer !== null;
    }

    /**
     * Determine whether the user can update the job post.
     */
    public function update(User $user, JobPost $jobPost): bool
    {
        if ($user->role === UserRole::ADMIN) {
            return true;
        }

        if ($user->role === UserRole::EMPLOYER && $user->employer !== null) {
            return $user->employer->id === $jobPost->employer_id;
        }

        return false;
    }

    /**
     * Determine whether the user can submit the job post for approval.
     */
    public function submit(User $user, JobPost $jobPost): bool
    {
        if ($user->role === UserRole::EMPLOYER && $user->employer !== null) {
            return $user->employer->id === $jobPost->employer_id
                && in_array($jobPost->status, [
                    JobStatus::DRAFT,
                    JobStatus::REJECTED,
                    JobStatus::CLOSED,
                    JobStatus::EXPIRED,
                    JobStatus::PENDING_APPROVAL,
                ], true);
        }

        return false;
    }

    /**
     * Determine whether the user can reopen the job post.
     */
    public function reopen(User $user, JobPost $jobPost): bool
    {
        if ($user->role === UserRole::ADMIN) {
            return true;
        }

        if ($user->role === UserRole::EMPLOYER && $user->employer !== null) {
            return $user->employer->id === $jobPost->employer_id
                && in_array($jobPost->status, [JobStatus::CLOSED, JobStatus::EXPIRED], true);
        }

        return false;
    }

    /**
     * Determine whether the user can approve the job post.
     */
    public function approve(User $user, JobPost $jobPost): bool
    {
        return $user->role === UserRole::ADMIN
            && $jobPost->status === JobStatus::PENDING_APPROVAL;
    }

    /**
     * Determine whether the user can reject the job post.
     */
    public function reject(User $user, JobPost $jobPost): bool
    {
        return $user->role === UserRole::ADMIN
            && $jobPost->status === JobStatus::PENDING_APPROVAL;
    }

    /**
     * Determine whether the user can close the job post.
     */
    public function close(User $user, JobPost $jobPost): bool
    {
        if ($jobPost->status !== JobStatus::PUBLISHED) {
            return false;
        }

        if ($user->role === UserRole::ADMIN) {
            return true;
        }

        if ($user->role === UserRole::EMPLOYER && $user->employer !== null) {
            return $user->employer->id === $jobPost->employer_id;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the job post.
     */
    public function delete(User $user, JobPost $jobPost): bool
    {
        if ($user->role === UserRole::ADMIN) {
            return true;
        }

        if ($user->role === UserRole::EMPLOYER && $user->employer !== null) {
            return $user->employer->id === $jobPost->employer_id;
        }

        return false;
    }
}
