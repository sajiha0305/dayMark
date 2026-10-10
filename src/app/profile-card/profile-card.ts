import { Component } from '@angular/core';

@Component({
  selector: 'app-profile-card',
  standalone: true,
  styleUrl: './profile-card.css',
  templateUrl: './profile-card.html',
})
export class ProfileCard {
  protected readonly profile = {
    initials: 'YN',
    name: 'Your Name',
    role: 'Frontend Developer',
    bio: 'I build clear, accessible web experiences and enjoy turning ideas into useful products.',
  };
}