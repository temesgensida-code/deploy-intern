<?php

declare(strict_types=1);

namespace App\Notifications\V1\Employer;

use App\Models\Employer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmployerApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Employer $employer
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
            ->subject('🎉 Congratulations! Your Company Profile Has Been Approved')
            ->greeting("Hello {$notifiable->name},")
            ->line("Great news! Your company profile for **{$this->employer->company_name}** has been verified and approved by our moderation team.")
            ->line('You are now ready to post open vacancies, review applications, and hire top talent.')
            ->action('Start Posting Jobs', $actionUrl)
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
            'type' => 'employer_approved',
            'title' => 'Company Profile Approved',
            'message' => "Congratulations! Your company profile for '{$this->employer->company_name}' has been approved by our admin team.",
            'employer_id' => $this->employer->id,
            'company_name' => $this->employer->company_name,
            'action_url' => '/company-profile',
            'approved_at' => now()->toIso8601String(),
        ];
    }
}
