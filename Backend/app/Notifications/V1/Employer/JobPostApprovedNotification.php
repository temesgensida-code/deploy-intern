<?php

declare(strict_types=1);

namespace App\Notifications\V1\Employer;

use App\Models\JobPost;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class JobPostApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public JobPost $jobPost
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
        $publicUrl = rtrim((string) config('app.frontend_url'), '/') . '/jobs/' . $this->jobPost->slug;

        return (new MailMessage)
            ->subject("Your Job Post is Live: {$this->jobPost->title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Congratulations! Your job listing **'{$this->jobPost->title}'** has been approved and published.")
            ->line('Job seekers can now view and apply for your position. Candidates whose skills algorithmically match this job will also receive recommendations.')
            ->action('Manage Job Post', $actionUrl)
            ->line("You can also view the public listing here: {$publicUrl}")
            ->line('Thank you for choosing ' . config('app.name') . '!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'job_post_approved',
            'title' => 'Job Post Approved & Published',
            'message' => "Your job post '{$this->jobPost->title}' has been approved and is now live.",
            'job_post_id' => $this->jobPost->id,
            'job_title' => $this->jobPost->title,
            'action_url' => '/my-job-posts',
            'approved_at' => now()->toIso8601String(),
        ];
    }
}
