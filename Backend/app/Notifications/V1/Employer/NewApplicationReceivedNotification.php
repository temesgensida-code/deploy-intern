<?php

declare(strict_types=1);

namespace App\Notifications\V1\Employer;

use App\Models\Application;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewApplicationReceivedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Application $application,
        public JobPost $jobPost,
        public User $applicant
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return list<string>
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
        $applicantsUrl = rtrim((string) config('app.frontend_url'), '/') . '/job-applicants';

        return (new MailMessage)
            ->subject("New Application: {$this->applicant->name} for {$this->jobPost->title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("You have received a new application for your open role **'{$this->jobPost->title}'**.")
            ->line("**Candidate Name:** {$this->applicant->name}")
            ->line("**Candidate Email:** {$this->applicant->email}")
            ->action('Review Candidate Application', $applicantsUrl)
            ->line('Log in to your employer dashboard to view their CV, evaluate qualifications, and schedule an interview.')
            ->line('Thank you for using ' . config('app.name') . '!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'new_application_received',
            'title' => 'New Job Application Received',
            'message' => "Candidate {$this->applicant->name} has applied for your position '{$this->jobPost->title}'.",
            'application_id' => $this->application->id,
            'job_post_id' => $this->jobPost->id,
            'job_title' => $this->jobPost->title,
            'applicant_name' => $this->applicant->name,
            'applicant_email' => $this->applicant->email,
            'action_url' => '/job-applicants',
            'applied_at' => now()->toIso8601String(),
        ];
    }
}
