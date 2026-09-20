<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\User\UploadCVRequest;
use App\Http\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserCVController extends Controller
{
    use ApiResponse;

    public function upload(UploadCVRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->cv_path && Storage::disk('local')->exists($user->cv_path)) {
            Storage::disk('local')->delete($user->cv_path);
        }

        $file = $request->file('cv');

        $path = $file->store('cvs/users', 'local');

        $user->update([
            'cv_path' => $path,
            'cv_original_name' => $file->getClientOriginalName(),
            'cv_uploaded_at' => now(),
        ]);

        return $this->success(
            ['cv_path' => $path],
            'CV uploaded successfully'
        );
    }

    public function download(Request $request): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        if (! $user->cv_path || ! Storage::disk('local')->exists($user->cv_path)) {
            return $this->error('CV not found', 404);
        }

        return Storage::disk('local')->download($user->cv_path, $user->cv_original_name ?? 'cv.pdf');
    }

    /**
     * Preview the authenticated user's CV inline.
     */
    public function preview(Request $request): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        if (! $user->cv_path || ! Storage::disk('local')->exists($user->cv_path)) {
            return $this->error('CV not found', 404);
        }

        return Storage::disk('local')->response(
            $user->cv_path,
            $user->cv_original_name ?? 'cv.pdf',
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="' . ($user->cv_original_name ?? 'cv.pdf') . '"',
            ]
        );
    }

    /**
     * Return the current CV status without downloading the file.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        $hasCv = $user->cv_path && Storage::disk('local')->exists($user->cv_path);

        return $this->success([
            'has_cv' => (bool) $hasCv,
            'cv_path' => $hasCv ? $user->cv_path : null,
            'cv_uploaded_at' => $hasCv ? $user->cv_uploaded_at : null,
            'file_name' => $hasCv ? $user->cv_original_name : null,
            'file_size' => $hasCv ? Storage::disk('local')->size($user->cv_path) : null,
        ], 'CV status retrieved successfully');
    }

    /**
     * Delete the authenticated user's CV.
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->cv_path || ! Storage::disk('local')->exists($user->cv_path)) {
            return $this->error('CV not found', 404);
        }

        Storage::disk('local')->delete($user->cv_path);

        $user->update([
            'cv_path' => null,
            'cv_original_name' => null,
            'cv_uploaded_at' => null,
        ]);

        return $this->success(null, 'CV deleted successfully');
    }
}
