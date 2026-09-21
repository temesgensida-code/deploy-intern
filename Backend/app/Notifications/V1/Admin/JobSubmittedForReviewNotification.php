<?php

declare(strict_types=1);

namespace App\Notifications\V1\Admin;

use App\Models\JobPost;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class JobSubmittedForReviewNotification extends Notification implements ShouldQueue
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
        $reviewUrl = rtrim((string) config('app.frontend_url'), '/') . '/admin/jobs';
        $companyName = $this->jobPost->employer->company_name ?? 'An employer';

        return (new MailMessage)
            ->subject("[Action Required] New Job Post Pending Review: {$this->jobPost->title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("A new job post **'{$this->jobPost->title}'** has been submitted by **{$companyName}** and is pending moderation.")
            ->when($this->jobPost->category?->name, fn (MailMessage $m) => $m->line("Category: {$this->jobPost->category->name}"))
            ->when($this->jobPost->location, fn (MailMessage $m) => $m->line("Location: {$this->jobPost->location}"))
            ->action('Moderate Job Post', $reviewUrl)
            ->line('Please review the job details to approve or reject the posting.')
            ->line('Thank you for administering ' . config('app.name') . '!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $companyName = $this->jobPost->employer->company_name ?? 'An employer';

        return [
            'type' => 'job_submitted_for_review',
            'title' => 'New Job Submitted for Review',
            'message' => "'{$this->jobPost->title}' was submitted by {$companyName} and is awaiting review.",
            'job_post_id' => $this->jobPost->id,
            'job_title' => $this->jobPost->title,
            'company_name' => $companyName,
            'action_url' => '/admin/jobs',
        ];
    }
}
