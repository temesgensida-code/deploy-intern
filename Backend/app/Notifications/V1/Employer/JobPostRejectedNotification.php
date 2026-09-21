<?php

declare(strict_types=1);

namespace App\Notifications\V1\Employer;

use App\Models\JobPost;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class JobPostRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public JobPost $jobPost,
        public string $reason
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
        $actionUrl = rtrim((string) config('app.frontend_url'), '/') . '/my-job-posts';

        return (new MailMessage)
            ->subject("Update regarding your Job Post: {$this->jobPost->title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("We are writing to let you know that your job post **'{$this->jobPost->title}'** could not be approved for publication.")
            ->line("**Reason provided:** {$this->reason}")
            ->line('You can edit the job details, requirements, or compensation and resubmit it for review at any time.')
            ->action('Edit & Resubmit Job Post', $actionUrl)
            ->line('Thank you for your understanding.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'job_post_rejected',
            'title' => 'Job Post Rejected',
            'message' => "Your job post '{$this->jobPost->title}' was rejected. Reason: {$this->reason}",
            'job_post_id' => $this->jobPost->id,
            'job_title' => $this->jobPost->title,
            'rejection_reason' => $this->reason,
            'action_url' => '/my-job-posts',
            'rejected_at' => now()->toIso8601String(),
        ];
    }
}
