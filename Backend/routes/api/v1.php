<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AdminApplicationController;
use App\Http\Controllers\Api\V1\AdminCompanyController;
use App\Http\Controllers\Api\V1\AdminJobPostController;
use App\Http\Controllers\Api\V1\AdminNotificationController;
use App\Http\Controllers\Api\V1\AdminStatsController;
use App\Http\Controllers\Api\V1\AdminUserController;
use App\Http\Controllers\Api\V1\ApplicationController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\EmployeeFeedController;
use App\Http\Controllers\Api\V1\EmployeeNotificationController;
use App\Http\Controllers\Api\V1\EmployeeProfileController;
use App\Http\Controllers\Api\V1\EmployerController;
use App\Http\Controllers\Api\V1\EmployerNotificationController;
use App\Http\Controllers\Api\V1\InterviewController;
use App\Http\Controllers\Api\V1\JobPostController;
use App\Http\Controllers\Api\V1\SavedJobController;
use App\Http\Controllers\Api\V1\UserCVController;
use App\Http\Controllers\Api\V1\UserNotificationPreferenceController;
use App\Http\Middleware\EnsureRole;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API V1 Routes
|--------------------------------------------------------------------------
|
| Routes for API version 1.
|
*/

// Health check
Route::get('health', fn () => response()->json([
    'status' => 'healthy',
    'timestamp' => now()->toDateTimeString(),
]))->name('api.v1.health');

// Public routes with auth rate limiter (5/min - brute force protection)
Route::middleware('throttle:auth')->group(function (): void {
    Route::post('register', [AuthController::class, 'register'])->name('api.v1.register');
    Route::post('login', [AuthController::class, 'login'])->name('api.v1.login');
});

// Email verification (OTP-based)
// Route registered under authenticated group below as email/verify-otp

// Protected routes with authenticated rate limiter (120/min)
Route::middleware(['auth:sanctum', 'throttle:authenticated'])->group(function (): void {
    Route::post('logout', [AuthController::class, 'logout'])->name('api.v1.logout');
    Route::get('profile', [AuthController::class, 'profile'])->name('api.v1.profile');

    // Change password
    Route::put('change-password', [AuthController::class, 'changePassword'])->name('api.v1.change-password');
    Route::post('confirm-change-password', [AuthController::class, 'confirmChangePassword'])->name('api.v1.confirm-change-password');
    Route::post('email/verify-otp', [AuthController::class, 'verifyEmailOtp'])->name('verification.verify');

    Route::post('email/resend', [AuthController::class, 'resendVerificationEmail'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    // Notification preferences
    Route::prefix('user/notification-preferences')->name('api.v1.user.notification-preferences.')->group(function (): void {
        Route::get('/', [UserNotificationPreferenceController::class, 'show'])->name('show');
        Route::put('/', [UserNotificationPreferenceController::class, 'update'])->name('update');
    });

    // CV upload/download/preview/status - protected by auth:sanctum
    Route::prefix('users/cv')->name('api.v1.users.cv.')->group(function (): void {
        Route::get('/', [UserCVController::class, 'status'])->name('index');
        Route::post('upload', [UserCVController::class, 'upload'])->name('upload');
        Route::get('download', [UserCVController::class, 'download'])->name('download');
        Route::get('preview', [UserCVController::class, 'preview'])->name('preview');
        Route::get('status', [UserCVController::class, 'status'])->name('status');
        Route::delete('/', [UserCVController::class, 'destroy'])->name('destroy');
    });

    // Protected feature routes requiring verified email address
    Route::middleware('verified')->group(function (): void {
        // Administrator Routes
        Route::middleware(EnsureRole::class . ':admin')->prefix('admin')->group(function (): void {
            Route::get('dashboard', fn () => response()->json([
                'success' => true,
                'message' => 'Welcome Administrator',
            ]))->name('api.v1.admin.dashboard');
            Route::get('categories', [CategoryController::class, 'adminIndex'])->name('api.v1.admin.categories.index');
            Route::get('stats', [AdminStatsController::class, 'index'])->name('api.v1.admin.stats');

            // Admin Job Moderation Workflow
            Route::prefix('jobs')->name('api.v1.admin.jobs.')->group(function (): void {
                Route::get('/', [AdminJobPostController::class, 'index'])->name('index');
                Route::get('pending', [AdminJobPostController::class, 'pendingIndex'])->name('pending');
                Route::post('{jobPost}/approve', [AdminJobPostController::class, 'approve'])->name('approve');
                Route::post('{jobPost}/reject', [AdminJobPostController::class, 'reject'])->name('reject');
                Route::delete('{jobPost}', [AdminJobPostController::class, 'destroy'])->name('destroy');
            });

            // Admin User Management Workflow
            Route::prefix('users')->name('api.v1.admin.users.')->group(function (): void {
                Route::get('/', [AdminUserController::class, 'index'])->name('index');
                Route::post('{user}/toggle-suspend', [AdminUserController::class, 'toggleSuspend'])->name('toggle-suspend');
                Route::delete('{user}', [AdminUserController::class, 'destroy'])->name('destroy');
            });

            // Admin Application Management Workflow
            Route::prefix('applications')->name('api.v1.admin.applications.')->group(function (): void {
                Route::get('/', [AdminApplicationController::class, 'index'])->name('index');
                Route::patch('{application}/status', [AdminApplicationController::class, 'updateStatus'])->name('update-status');
                Route::delete('{application}', [AdminApplicationController::class, 'destroy'])->name('destroy');
                Route::get('{application}/download-cv', [AdminApplicationController::class, 'downloadCv'])->name('download-cv');
            });

            // Admin Companies / Employers Management Workflow
            Route::prefix('companies')->name('api.v1.admin.companies.')->group(function (): void {
                Route::get('/', [AdminCompanyController::class, 'index'])->name('index');
                Route::get('{employer}', [AdminCompanyController::class, 'show'])->name('show');
                Route::match(['put', 'patch'], '{employer}', [AdminCompanyController::class, 'update'])->name('update');
                Route::patch('{employer}/status', [AdminCompanyController::class, 'updateStatus'])->name('update-status');
                Route::post('{employer}/approve', [AdminCompanyController::class, 'approve'])->name('approve');
                Route::post('{employer}/approved', [AdminCompanyController::class, 'approve'])->name('approved');
                Route::post('{employer}/reject', [AdminCompanyController::class, 'reject'])->name('reject');
                Route::post('{employer}/rejected', [AdminCompanyController::class, 'reject'])->name('rejected');
                Route::delete('{employer}', [AdminCompanyController::class, 'destroy'])->name('destroy');
            });

            // Admin Notifications Workflow
            Route::prefix('notifications')->name('api.v1.admin.notifications.')->group(function (): void {
                Route::get('/', [AdminNotificationController::class, 'index'])->name('index');
                Route::get('stream', [AdminNotificationController::class, 'stream'])->name('stream');
                Route::get('unread-count', [AdminNotificationController::class, 'unreadCount'])->name('unread-count');
                Route::patch('{id}/read', [AdminNotificationController::class, 'markAsRead'])->name('read');
                Route::post('mark-all-read', [AdminNotificationController::class, 'markAllAsRead'])->name('mark-all-read');
                Route::delete('{id}', [AdminNotificationController::class, 'destroy'])->name('destroy');
            });
        });

        // Employer Routes
        Route::middleware(EnsureRole::class . ':employer')->prefix('employer')->group(function (): void {
            Route::get('dashboard', fn () => response()->json([
                'success' => true,
                'message' => 'Welcome Employer',
            ]))->name('api.v1.employer.dashboard');

            // Employer Profile Management
            Route::get('profile', [EmployerController::class, 'myProfile'])->name('api.v1.employer.profile');
            Route::post('profile', [EmployerController::class, 'updateMyProfile'])->name('api.v1.employer.profile.update');
            Route::put('profile', [EmployerController::class, 'updateMyProfile'])->name('api.v1.employer.profile.put');

            // Employer Job Post Management
            Route::prefix('jobs')->name('api.v1.employer.jobs.')->group(function (): void {
                Route::get('/', [JobPostController::class, 'employerIndex'])->name('index');
                Route::post('/', [JobPostController::class, 'store'])->name('store');
                Route::put('{jobPost}', [JobPostController::class, 'update'])->name('update');
                Route::delete('{jobPost}', [JobPostController::class, 'destroy'])->name('destroy');
                Route::post('{jobPost}/submit', [JobPostController::class, 'submit'])->name('submit');
                Route::post('{jobPost}/close', [JobPostController::class, 'close'])->name('close');
                Route::get('{jobPost}/applicants', [ApplicationController::class, 'jobApplicants'])->name('applicants');
            });

            // Application status management & applicant review
            Route::get('applications/{application}', [ApplicationController::class, 'showApplicant'])->name('api.v1.employer.applications.show');
            Route::match(['put', 'patch'], 'applications/{application}/status', [ApplicationController::class, 'updateStatus'])->name('api.v1.employer.applications.status');
            Route::get('applications/{application}/cv', [ApplicationController::class, 'downloadCv'])->name('api.v1.employer.applications.cv');

            // Interview scheduling for shortlisted candidates
            Route::post('applications/{application}/interview', [InterviewController::class, 'schedule'])->name('api.v1.employer.applications.interview.schedule');
            Route::get('applications/{application}/interview', [InterviewController::class, 'show'])->name('api.v1.employer.applications.interview.show');
            Route::delete('applications/{application}/interview', [InterviewController::class, 'cancel'])->name('api.v1.employer.applications.interview.cancel');

            // Employer Notifications Workflow
            Route::prefix('notifications')->name('api.v1.employer.notifications.')->group(function (): void {
                Route::get('/', [EmployerNotificationController::class, 'index'])->name('index');
                Route::get('stream', [EmployerNotificationController::class, 'stream'])->name('stream');
                Route::get('unread-count', [EmployerNotificationController::class, 'unreadCount'])->name('unread-count');
                Route::patch('{id}/read', [EmployerNotificationController::class, 'markAsRead'])->name('read');
                Route::post('mark-all-read', [EmployerNotificationController::class, 'markAllAsRead'])->name('mark-all-read');
                Route::delete('{id}', [EmployerNotificationController::class, 'destroy'])->name('destroy');
            });
        });

        // Employee Routes
        Route::middleware(EnsureRole::class . ':employee')->prefix('employee')->group(function (): void {
            Route::get('dashboard', fn () => response()->json([
                'success' => true,
                'message' => 'Welcome Employee',
            ]))->name('api.v1.employee.dashboard');

            // Profile Management & Setup Status
            Route::get('profile', [EmployeeProfileController::class, 'show'])->name('api.v1.employee.profile');
            Route::match(['put', 'patch', 'post'], 'profile', [EmployeeProfileController::class, 'update'])->name('api.v1.employee.profile.update');

            // Algorithmic Job Match Feed
            Route::prefix('feed')->name('api.v1.employee.feed.')->group(function (): void {
                Route::get('/', [EmployeeFeedController::class, 'index'])->name('index');
                Route::post('{jobPost}/dismiss', [EmployeeFeedController::class, 'dismiss'])->name('dismiss');
            });

            // Notifications & Realtime SSE Stream
            Route::prefix('notifications')->name('api.v1.employee.notifications.')->group(function (): void {
                Route::get('/', [EmployeeNotificationController::class, 'index'])->name('index');
                Route::get('stream', [EmployeeNotificationController::class, 'stream'])->name('stream');
                Route::get('unread-count', [EmployeeNotificationController::class, 'unreadCount'])->name('unread-count');
                Route::patch('{id}/read', [EmployeeNotificationController::class, 'markAsRead'])->name('read');
                Route::post('mark-all-read', [EmployeeNotificationController::class, 'markAllAsRead'])->name('mark-all-read');
                Route::delete('{id}', [EmployeeNotificationController::class, 'destroy'])->name('destroy');
            });

            // Job Applications
            Route::prefix('applications')->name('api.v1.employee.applications.')->group(function (): void {
                Route::get('/', [ApplicationController::class, 'index'])->name('index');
                Route::get('{application}/interview', [InterviewController::class, 'show'])->name('interview.show');
            });

            // Saved Jobs
            Route::prefix('saved-jobs')->name('api.v1.employee.saved-jobs.')->group(function (): void {
                Route::get('/', [SavedJobController::class, 'index'])->name('index');
                Route::get('ids', [SavedJobController::class, 'savedJobIds'])->name('ids');
                Route::post('{jobPost}', [SavedJobController::class, 'store'])->name('store');
                Route::delete('{jobPost}', [SavedJobController::class, 'destroy'])->name('destroy');
                Route::post('{jobPost}/toggle', [SavedJobController::class, 'toggle'])->name('toggle');
            });
        });

        // Apply to a job post (employee role, enforced in FormRequest)
        Route::post('jobs/{jobPost}/apply', [ApplicationController::class, 'store'])->name('api.v1.jobs.apply');

        // Employer approval routes (Admin controlled with internal role check)
        Route::prefix('employers')->name('api.v1.employers.')->group(function (): void {
            Route::get('pending', [EmployerController::class, 'pending'])->name('pending');
            Route::put('{employer}/approval-status', [EmployerController::class, 'updateApprovalStatus'])->name('approval-status');
        });

        // Employer profiles - protected by auth:sanctum, verified & employer role
        Route::middleware(EnsureRole::class . ':employer')->prefix('employers')->name('api.v1.employers.')->group(function (): void {
            Route::get('/', [EmployerController::class, 'index'])->name('index');
            Route::post('/', [EmployerController::class, 'store'])->name('store');
            Route::get('{employer}', [EmployerController::class, 'show'])->name('show');
            Route::put('{employer}', [EmployerController::class, 'update'])->name('update');
            Route::delete('{employer}', [EmployerController::class, 'destroy'])->name('destroy');
        });

        // Category management - admin only & verified
        Route::middleware(EnsureRole::class . ':admin')->prefix('categories')->name('api.v1.categories.')->group(function (): void {
            Route::post('/', [CategoryController::class, 'store'])->name('store');
            Route::put('{category}', [CategoryController::class, 'update'])->name('update');
            Route::delete('{category}', [CategoryController::class, 'destroy'])->name('destroy');
        });
    });
});

// Password reset routes (public with rate limiting)
Route::middleware('throttle:6,1')->group(function (): void {
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])
        ->name('password.email');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])
        ->name('password.reset');
});

// Public category browsing (no auth required)
Route::prefix('categories')->name('api.v1.categories.')->group(function (): void {
    Route::get('/', [CategoryController::class, 'index'])->name('index');
    Route::get('{category}', [CategoryController::class, 'show'])->name('show');
});

// Public Job Post Browsing
Route::prefix('jobs')->name('api.v1.jobs.')->group(function (): void {
    Route::get('/', [JobPostController::class, 'index'])->name('index');
    Route::get('{jobPost:slug}', [JobPostController::class, 'show'])->name('show');
});
