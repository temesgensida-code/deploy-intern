<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Employer;
use App\Models\JobPost;
use App\Notifications\V1\Employer\EmployerApprovedNotification;
use App\Notifications\V1\Employer\EmployerRejectedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCompanyController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of all employer companies for Admin.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Employer::with('user')
            ->withCount('jobPosts');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('company_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('industry', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search): void {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        if ($status = $request->input('status')) {
            if ($status !== 'all') {
                $query->where('approval_status', $status);
            }
        }

        $companies = $query->latest()->paginate($request->integer('per_page', 15));

        $stats = [
            'total_companies' => Employer::count(),
            'approved_companies' => Employer::where('approval_status', 'approved')->count(),
            'pending_companies' => Employer::where('approval_status', 'pending')->count(),
            'rejected_companies' => Employer::where('approval_status', 'rejected')->count(),
            'total_jobs' => JobPost::count(),
        ];

        return $this->success([
            'companies' => $companies,
            'stats' => $stats,
        ], 'Companies retrieved successfully');
    }

    /**
     * Display the specified company detail.
     */
    public function show(Employer $employer): JsonResponse
    {
        $employer->load(['user', 'jobPosts.category']);

        return $this->success($employer, 'Company details retrieved successfully');
    }

    /**
     * Update an employer company profile details as admin.
     */
    public function update(Request $request, Employer $employer): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'company_size' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'approval_status' => ['sometimes', 'required', 'string', 'in:approved,pending,rejected'],
        ]);

        $employer->update($validated);

        if (isset($validated['approval_status'])) {
            if ($validated['approval_status'] === 'approved') {
                $employer->user?->notify(new EmployerApprovedNotification($employer));
            } elseif ($validated['approval_status'] === 'rejected') {
                $employer->user?->notify(new EmployerRejectedNotification($employer));
            }
        }

        return $this->success($employer->fresh()->load('user'), 'Company profile updated successfully');
    }

    /**
     * Update approval status of a company.
     */
    public function updateStatus(Request $request, Employer $employer): JsonResponse
    {
        $validated = $request->validate([
            'approval_status' => ['required', 'string', 'in:approved,pending,rejected'],
        ]);

        $newStatus = $validated['approval_status'];
        $employer->update([
            'approval_status' => $newStatus,
        ]);

        if ($newStatus === 'approved') {
            $employer->user?->notify(new EmployerApprovedNotification($employer));
        } elseif ($newStatus === 'rejected') {
            $employer->user?->notify(new EmployerRejectedNotification($employer));
        }

        return $this->success($employer->load('user'), 'Company status updated successfully');
    }

    /**
     * Approve a company profile.
     */
    public function approve(Employer $employer): JsonResponse
    {
        $employer->update([
            'approval_status' => 'approved',
        ]);

        $employer->user?->notify(new EmployerApprovedNotification($employer));

        return $this->success($employer->load('user'), 'Company profile approved successfully');
    }

    /**
     * Reject a company profile.
     */
    public function reject(Employer $employer): JsonResponse
    {
        $employer->update([
            'approval_status' => 'rejected',
        ]);

        $employer->user?->notify(new EmployerRejectedNotification($employer));

        return $this->success($employer->load('user'), 'Company profile rejected successfully');
    }

    /**
     * Remove the specified company profile.
     */
    public function destroy(Employer $employer): JsonResponse
    {
        $employer->delete();

        return $this->deleted('Company profile deleted successfully');
    }
}
