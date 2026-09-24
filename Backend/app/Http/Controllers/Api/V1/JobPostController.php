<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\JobStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\StoreJobPostRequest;
use App\Http\Requests\V1\UpdateJobPostRequest;
use App\Http\Resources\V1\JobPostResource;
use App\Http\Traits\ApiResponse;
use App\Models\JobPost;
use App\Services\JobPostWorkflowService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class JobPostController extends Controller
{
    use ApiResponse, AuthorizesRequests;

    /**
     * Display a listing of published job posts (Public).
     */
    public function index(Request $request): JsonResponse
    {
        $jobs = JobPost::published()
            ->with(['employer', 'category'])
            ->filter($request->all())
            ->latest('published_at')
            ->paginate($request->integer('per_page', 15));

        return $this->success(
            JobPostResource::collection($jobs)->response()->getData(true),
            'Published job listings retrieved successfully'
        );
    }

    /**
     * Display the specified published job post detail (Public).
     */
    public function show(JobPost $jobPost): JsonResponse
    {
        $this->authorize('view', $jobPost);

        $jobPost->increment('views_count');
        $jobPost->load(['employer', 'category']);

        return $this->success(
            new JobPostResource($jobPost),
            'Job post retrieved successfully'
        );
    }

    /**
     * Display a listing of job posts owned by authenticated employer.
     */
    public function employerIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        $employer = $user?->employer;

        if (! $employer) {
            return $this->error('Employer profile not found', 404);
        }

        $jobs = JobPost::where('employer_id', $employer->id)
            ->with(['category'])
            ->filter($request->all())
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->success(
            JobPostResource::collection($jobs)->response()->getData(true),
            'Employer job listings retrieved successfully'
        );
    }

    /**
     * Store a newly created job post by authenticated employer.
     */
    public function store(StoreJobPostRequest $request, JobPostWorkflowService $workflowService): JsonResponse
    {
        $this->authorize('create', JobPost::class);

        $user = $request->user();
        $employer = $user?->employer;

        if (! $employer) {
            return $this->error('Employer profile not found. Please complete your company profile before posting jobs.', 422);
        }

        $validated = $request->validated();
        $submitNow = $request->boolean('submit_now');
        unset($validated['submit_now']);

        if (isset($validated['requirements']) && is_string($validated['requirements'])) {
            $validated['requirements'] = array_values(array_filter(array_map('trim', explode("\n", $validated['requirements']))));
        }
        if (isset($validated['responsibilities']) && is_string($validated['responsibilities'])) {
            $validated['responsibilities'] = array_values(array_filter(array_map('trim', explode("\n", $validated['responsibilities']))));
        }

        $job = JobPost::create([
            ...$validated,
            'employer_id' => $employer->id,
            'status' => JobStatus::DRAFT,
        ]);

        if ($submitNow) {
            $job = $workflowService->submitForReview($job);
        }

        $job->load(['employer', 'category']);

        return $this->created(
            new JobPostResource($job),
            $job->status === JobStatus::PENDING_APPROVAL
                ? 'Job post created and submitted for review successfully'
                : 'Job post draft saved successfully'
        );
    }

    /**
     * Display the specified job post detail for the employer.
     */
    public function employerShow(JobPost $jobPost): JsonResponse
    {
        $this->authorize('view', $jobPost);

        $jobPost->load(['employer', 'category']);

        return $this->success(
            new JobPostResource($jobPost),
            'Job post retrieved successfully'
        );
    }

    /**
     * Update the specified job post.
     */
    public function update(UpdateJobPostRequest $request, JobPost $jobPost, JobPostWorkflowService $workflowService): JsonResponse
    {
        $this->authorize('update', $jobPost);

        $validated = $request->validated();
        $submitNow = $request->boolean('submit_now');
        unset($validated['submit_now']);

        if (isset($validated['deadline']) && ! isset($validated['expires_at'])) {
            $validated['expires_at'] = $validated['deadline'];
        }
        unset($validated['deadline']);

        if (isset($validated['requirements']) && is_string($validated['requirements'])) {
            $validated['requirements'] = array_values(array_filter(array_map('trim', explode("\n", $validated['requirements']))));
        }
        if (isset($validated['responsibilities']) && is_string($validated['responsibilities'])) {
            $validated['responsibilities'] = array_values(array_filter(array_map('trim', explode("\n", $validated['responsibilities']))));
        }

        $jobPost->update($validated);

        if ($submitNow) {
            $jobPost = $workflowService->submitForReview($jobPost);
        }

        $jobPost->load(['employer', 'category']);

        return $this->success(
            new JobPostResource($jobPost),
            $submitNow
                ? 'Job post updated and submitted for review successfully'
                : 'Job post updated successfully'
        );
    }

    /**
     * Submit a draft or rejected job post for admin approval.
     */
    public function submit(JobPost $jobPost, JobPostWorkflowService $workflowService): JsonResponse
    {
        $this->authorize('submit', $jobPost);

        try {
            $updated = $workflowService->submitForReview($jobPost);
            $updated->load(['employer', 'category']);

            return $this->success(
                new JobPostResource($updated),
                'Job post submitted for admin approval successfully'
            );
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Close a published job post.
     */
    public function close(JobPost $jobPost, JobPostWorkflowService $workflowService): JsonResponse
    {
        $this->authorize('close', $jobPost);

        try {
            $updated = $workflowService->close($jobPost);
            $updated->load(['employer', 'category']);

            return $this->success(
                new JobPostResource($updated),
                'Job post closed successfully'
            );
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Reopen a closed job post.
     */
    public function reopen(JobPost $jobPost, JobPostWorkflowService $workflowService): JsonResponse
    {
        $this->authorize('reopen', $jobPost);

        try {
            $updated = $workflowService->reopen($jobPost);
            $updated->load(['employer', 'category']);

            return $this->success(
                new JobPostResource($updated),
                'Job post reopened successfully'
            );
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Remove the specified job post (Soft delete).
     */
    public function destroy(JobPost $jobPost): JsonResponse
    {
        $this->authorize('delete', $jobPost);

        $jobPost->delete();

        return $this->deleted('Job post deleted successfully');
    }
}
