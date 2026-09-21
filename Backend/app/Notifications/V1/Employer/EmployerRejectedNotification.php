<?php

declare(strict_types=1);

namespace App\Notifications\V1\Employer;

use App\Models\Employer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmployerRejectedNotification extends Notification implements ShouldQueue
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
        $actionUrl = rtrim((string) config('app.frontend_url'), '/') . '/company-profile';

        return (new MailMessage)
            ->subject('Important update regarding your Company Profile verification')
            ->greeting("Hello {$notifiable->name},")
            ->line("Thank you for your interest in hiring on " . config('app.name') . ".")
            ->line("After careful review, our moderation team could not approve the company profile for **{$this->employer->company_name}** at this time.")
            ->line('Please review your company details, ensure your legal business name, description, and website information are accurate, and update your profile.')
            ->action('Review & Update Profile', $actionUrl)
            ->line('If you have any questions or believe this is an error, please reach out to our support team.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'employer_rejected',
            'title' => 'Company Profile Rejected',
            'message' => "Your company profile for '{$this->employer->company_name}' could not be approved. Please review your company details and update them.",
            'employer_id' => $this->employer->id,
            'company_name' => $this->employer->company_name,
            'action_url' => '/company-profile',
            'rejected_at' => now()->toIso8601String(),
        ];
    }
}
