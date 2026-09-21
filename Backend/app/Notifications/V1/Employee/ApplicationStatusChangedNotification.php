<?php

declare(strict_types=1);

namespace App\Notifications\V1\Employee;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\JobPost;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationStatusChangedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Application $application,
        public JobPost $jobPost,
        public ApplicationStatus $status
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (method_exists($notifiable, 'wantsEmailNotifications') && $notifiable->wantsEmailNotifications()) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $statusLabel = match ($this->status) {
            ApplicationStatus::SUBMITTED => 'Submitted',
            ApplicationStatus::UNDER_REVIEW => 'Under Review',
            ApplicationStatus::SHORTLISTED => 'Shortlisted',
            ApplicationStatus::REJECTED => 'Rejected',
            ApplicationStatus::HIRED => 'Hired',
        };

        $companyName = $this->jobPost->employer->company_name ?? 'The employer';
        $actionUrl = rtrim((string) config('app.frontend_url'), '/') . '/my-applications';

        $mail = (new MailMessage)
            ->subject("Application Update: {$this->jobPost->title} at {$companyName}")
            ->greeting("Hello {$notifiable->name},")
            ->line("The status of your application for **'{$this->jobPost->title}'** at **{$companyName}** has been updated.")
            ->line("**New Status:** {$statusLabel}");

        if ($this->status === ApplicationStatus::SHORTLISTED) {
            $mail->line('Great job! Your profile stood out and the hiring team has shortlisted your application. Watch your dashboard for upcoming interview schedules.');
        } elseif ($this->status === ApplicationStatus::HIRED) {
            $mail->line('🎉 Congratulations on receiving an offer and being hired! We wish you great success in your new position.');
        } elseif ($this->status === ApplicationStatus::UNDER_REVIEW) {
            $mail->line('The hiring manager is actively evaluating candidate submissions.');
        }

        return $mail
            ->action('View Application Status', $actionUrl)
            ->line('Thank you for searching for opportunities on ' . config('app.name') . '!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $statusLabel = match ($this->status) {
            ApplicationStatus::SUBMITTED => 'Submitted',
            ApplicationStatus::UNDER_REVIEW => 'Under Review',
            ApplicationStatus::SHORTLISTED => 'Shortlisted',
            ApplicationStatus::REJECTED => 'Rejected',
            ApplicationStatus::HIRED => 'Hired',
        };

        $companyName = $this->jobPost->employer->company_name ?? 'The employer';

        return [
            'type' => 'application_status_changed',
            'title' => 'Application Status Updated',
            'message' => "Your application for '{$this->jobPost->title}' at {$companyName} has been updated to {$statusLabel}.",
            'application_id' => $this->application->id,
            'job_post_id' => $this->jobPost->id,
            'job_title' => $this->jobPost->title,
            'company_name' => $companyName,
            'status' => $this->status->value,
            'status_label' => $statusLabel,
            'action_url' => '/my-applications',
            'updated_at' => now()->toIso8601String(),
        ];
    }
}
