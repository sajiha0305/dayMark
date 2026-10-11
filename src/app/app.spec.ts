import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { App } from './app';
import { AuthApiService } from './auth-api.service';

const authApiStub = {
  account: signal(null),
  initialize: vi.fn().mockResolvedValue(undefined),
};

describe('App', () => {
  beforeEach(async () => {
    authApiStub.account.set(null);
    authApiStub.initialize.mockClear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: AuthApiService, useValue: authApiStub }],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should show the sign-in screen when there is no account session', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('Welcome back');
  });
});
