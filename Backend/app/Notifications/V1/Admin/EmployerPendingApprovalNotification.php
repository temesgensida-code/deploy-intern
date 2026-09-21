<?php

declare(strict_types=1);

namespace App\Notifications\V1\Admin;

use App\Models\Employer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmployerPendingApprovalNotification extends Notification implements ShouldQueue
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
        $reviewUrl = rtrim((string) config('app.frontend_url'), '/') . '/admin/companies';
        $companyName = $this->employer->company_name ?? 'An employer';

        return (new MailMessage)
            ->subject("[Action Required] New Employer Pending Review: {$companyName}")
            ->greeting("Hello {$notifiable->name},")
            ->line("A new company profile for **{$companyName}** has been submitted and is awaiting administrator verification.")
            ->when($this->employer->website, fn (MailMessage $m) => $m->line("Company Website: {$this->employer->website}"))
            ->when($this->employer->location, fn (MailMessage $m) => $m->line("Location: {$this->employer->location}"))
            ->action('Review Company Profile', $reviewUrl)
            ->line('Please review and approve or reject this profile to allow them to post vacancies.')
            ->line('Thank you for administering ' . config('app.name') . '!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'employer_pending_approval',
            'title' => 'New Employer Awaiting Approval',
            'message' => "'{$this->employer->company_name}' submitted their company profile for review.",
            'employer_id' => $this->employer->id,
            'company_name' => $this->employer->company_name,
            'action_url' => '/admin/companies',
        ];
    }
}
