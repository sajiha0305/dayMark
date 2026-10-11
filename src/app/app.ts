import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, inject, signal } from '@angular/core';
import { ApiMessage, AuthApiService } from './auth-api.service';

type DashboardPage = 'overview' | 'budget' | 'hobbies';
type AuthMode = 'login' | 'register';

interface BudgetCategory {
  id: string;
  name: string;
  limit: number;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  date: string;
}

interface Hobby {
  id: string;
  name: string;
  dailyGoal: number;
}

interface HobbyLog {
  id: string;
  hobbyId: string;
  minutes: number;
  date: string;
}

interface SavedState {
  income: number;
  currency: string;
  categories: BudgetCategory[];
  expenses: Expense[];
  hobbies: Hobby[];
  hobbyLogs: HobbyLog[];
}

const STARTER_CATEGORIES: BudgetCategory[] = [
  { id: 'home', name: 'Home & bills', limit: 0 },
  { id: 'food', name: 'Groceries', limit: 0 },
  { id: 'transport', name: 'Transport', limit: 0 },
  { id: 'health', name: 'Health', limit: 0 },
  { id: 'fun', name: 'Eating out & fun', limit: 0 },
  { id: 'other', name: 'Everything else', limit: 0 },
];

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly api = inject(AuthApiService);
  protected readonly Math = Math;
  protected readonly initialized = signal(false);
  protected readonly authMode = signal<AuthMode>('login');
  protected readonly authError = signal('');
  protected readonly authNotice = signal('');
  protected readonly dataError = signal('');
  protected readonly legacyAvailable = signal(false);
  protected readonly migrationAvailable = signal(false);
  protected readonly importFileSelected = signal(false);
  protected readonly activePage = signal<DashboardPage>('overview');
  protected readonly income = signal(0);
  protected readonly currency = signal('USD');
  protected readonly categories = signal<BudgetCategory[]>(STARTER_CATEGORIES);
  protected readonly expenses = signal<Expense[]>([]);
  protected readonly hobbies = signal<Hobby[]>([]);
  protected readonly hobbyLogs = signal<HobbyLog[]>([]);
  protected readonly expenseFormOpen = signal(false);
  protected readonly categoryFormOpen = signal(false);
  protected readonly hobbyFormOpen = signal(false);
  protected readonly logFormOpen = signal(false);
  private saveQueue: Promise<void> = Promise.resolve();
  protected readonly todayKey = this.toDateKey(new Date());
  protected readonly currentMonthKey = this.todayKey.slice(0, 7);
  protected readonly monthLabel = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  protected readonly todayLabel = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  constructor() {
    afterNextRender(() => {
      this.legacyAvailable.set(this.readLegacyState() !== null);
      void this.initializeApp();
    });
  }

  protected async login(event: Event, username: string, password: string): Promise<void> {
    event.preventDefault();
    this.authError.set('');
    this.authNotice.set('');
    try {
      await this.api.login(username, password);
      await this.loadTracker();
      this.legacyAvailable.set(this.readLegacyState() !== null);
    } catch (error) {
      this.authError.set(this.errorMessage(error));
    }
  }

  protected async register(
    event: Event,
    username: string,
    password: string,
    confirmation: string,
    form: HTMLFormElement,
  ): Promise<void> {
    event.preventDefault();
    this.authError.set('');
    this.authNotice.set('');
    if (password !== confirmation) {
      this.authError.set('The passwords do not match.');
      return;
    }
    try {
      const result = await this.api.register(username, password);
      form.reset();
      this.authMode.set('login');
      this.authNotice.set(result.message);
    } catch (error) {
      this.authError.set(this.errorMessage(error));
    }
  }

  protected async logout(): Promise<void> {
    this.dataError.set('');
    try {
      await this.api.logout();
      this.income.set(0);
      this.currency.set('USD');
      this.categories.set([]);
      this.expenses.set([]);
      this.hobbies.set([]);
      this.hobbyLogs.set([]);
      this.closeForms();
    } catch (error) {
      this.dataError.set(this.errorMessage(error));
    }
  }

  protected downloadLegacyData(): void {
    const state = this.readLegacyState();
    if (!state) return;
    const data = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'daymark-browser-data.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  protected async chooseImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const state = JSON.parse(await file.text()) as SavedState;
      this.assertSavedState(state);
      await this.importLegacyState(state, false);
    } catch (error) {
      this.dataError.set(this.errorMessage(error, 'That file is not a valid Daymark data export.'));
    } finally {
      input.value = '';
    }
  }

  protected async importBrowserData(): Promise<void> {
    const state = this.readLegacyState();
    if (!state) {
      this.dataError.set('No saved Daymark data was found in this browser.');
      return;
    }
    await this.importLegacyState(state, true);
  }

  protected dismissMigration(): void {
    const account = this.api.account();
    if (account) {
      window.localStorage.setItem(`daymark-migration-dismissed:${account.id}`, 'true');
    }
    this.migrationAvailable.set(false);
  }

  protected setPage(page: DashboardPage): void {
    this.activePage.set(page);
    this.closeForms();
  }

  protected totalSpent(): number {
    return this.expenses()
      .filter((expense) => expense.date.startsWith(this.currentMonthKey))
      .reduce((total, expense) => total + expense.amount, 0);
  }

  protected totalPlanned(): number {
    return this.categories().reduce((total, category) => total + category.limit, 0);
  }

  protected availableBalance(): number {
    return this.income() - this.totalSpent();
  }

  protected unallocatedAmount(): number {
    return this.income() - this.totalPlanned();
  }

  protected categorySpent(categoryId: string): number {
    return this.expenses()
      .filter(
        (expense) =>
          expense.categoryId === categoryId && expense.date.startsWith(this.currentMonthKey),
      )
      .reduce((total, expense) => total + expense.amount, 0);
  }

  protected categoryProgress(category: BudgetCategory): number {
    return category.limit > 0
      ? Math.min((this.categorySpent(category.id) / category.limit) * 100, 100)
      : 0;
  }

  protected recentExpenses(): Expense[] {
    return this.expenses()
      .filter((expense) => expense.date.startsWith(this.currentMonthKey))
      .slice()
      .sort((first, second) => second.date.localeCompare(first.date) || second.id.localeCompare(first.id))
      .slice(0, 5);
  }

  protected dailyMinutes(hobbyId: string): number {
    return this.hobbyLogs()
      .filter((log) => log.hobbyId === hobbyId && log.date === this.todayKey)
      .reduce((total, log) => total + log.minutes, 0);
  }

  protected totalDailyMinutes(): number {
    return this.hobbyLogs()
      .filter((log) => log.date === this.todayKey)
      .reduce((total, log) => total + log.minutes, 0);
  }

  protected hobbyProgress(hobby: Hobby): number {
    return hobby.dailyGoal > 0
      ? Math.min((this.dailyMinutes(hobby.id) / hobby.dailyGoal) * 100, 100)
      : 0;
  }

  protected formatMoney(amount: number): string {
    const locale = this.currency() === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency(),
      maximumFractionDigits: 0,
    }).format(amount);
  }

  protected formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) return `${remainingMinutes} min`;
    return remainingMinutes === 0 ? `${hours} hr` : `${hours} hr ${remainingMinutes} min`;
  }

  protected categoryName(categoryId: string): string {
    return this.categories().find((category) => category.id === categoryId)?.name ?? 'Other';
  }

  protected setIncome(event: Event): void {
    const amount = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(amount) && amount >= 0) {
      this.income.set(amount);
      this.saveState();
    }
  }

  protected setCurrency(event: Event): void {
    this.currency.set((event.target as HTMLSelectElement).value);
    this.saveState();
  }

  protected updateCategoryLimit(categoryId: string, event: Event): void {
    const limit = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(limit) || limit < 0) return;
    this.categories.update((categories) =>
      categories.map((category) =>
        category.id === categoryId ? { ...category, limit } : category,
      ),
    );
    this.saveState();
  }

  protected addExpense(
    event: Event,
    title: string,
    amount: number,
    categoryId: string,
    form: HTMLFormElement,
  ): void {
    event.preventDefault();
    const cleanedTitle = title.trim();
    if (!cleanedTitle || !Number.isFinite(amount) || amount <= 0) return;
    this.expenses.update((expenses) => [
      {
        id: this.newId(),
        title: cleanedTitle,
        amount,
        categoryId,
        date: this.todayKey,
      },
      ...expenses,
    ]);
    this.saveState();
    form.reset();
    this.expenseFormOpen.set(false);
  }

  protected deleteExpense(expenseId: string): void {
    this.expenses.update((expenses) => expenses.filter((expense) => expense.id !== expenseId));
    this.saveState();
  }

  protected addCategory(
    event: Event,
    name: string,
    limit: number,
    form: HTMLFormElement,
  ): void {
    event.preventDefault();
    const cleanedName = name.trim();
    if (!cleanedName || !Number.isFinite(limit) || limit < 0) return;
    this.categories.update((categories) => [
      ...categories,
      { id: this.newId(), name: cleanedName, limit },
    ]);
    this.saveState();
    form.reset();
    this.categoryFormOpen.set(false);
  }

  protected addHobby(event: Event, name: string, goal: number, form: HTMLFormElement): void {
    event.preventDefault();
    const cleanedName = name.trim();
    if (!cleanedName || !Number.isFinite(goal) || goal <= 0) return;
    this.hobbies.update((hobbies) => [...hobbies, { id: this.newId(), name: cleanedName, dailyGoal: goal }]);
    this.saveState();
    form.reset();
    this.hobbyFormOpen.set(false);
  }

  protected logHobby(
    event: Event,
    hobbyId: string,
    minutes: number,
    form: HTMLFormElement,
  ): void {
    event.preventDefault();
    if (!hobbyId || !Number.isFinite(minutes) || minutes <= 0) return;
    this.hobbyLogs.update((logs) => [
      { id: this.newId(), hobbyId, minutes, date: this.todayKey },
      ...logs,
    ]);
    this.saveState();
    form.reset();
    this.logFormOpen.set(false);
  }

  protected toggleForm(form: 'expense' | 'category' | 'hobby' | 'log'): void {
    this.closeForms();
    if (form === 'expense') this.expenseFormOpen.set(true);
    if (form === 'category') this.categoryFormOpen.set(true);
    if (form === 'hobby') this.hobbyFormOpen.set(true);
    if (form === 'log') this.logFormOpen.set(true);
  }

  protected closeForms(): void {
    this.expenseFormOpen.set(false);
    this.categoryFormOpen.set(false);
    this.hobbyFormOpen.set(false);
    this.logFormOpen.set(false);
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private newId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private async initializeApp(): Promise<void> {
    try {
      await this.api.initialize();
      if (this.api.account()) {
        await this.loadTracker();
        this.legacyAvailable.set(this.readLegacyState() !== null);
      }
    } catch (error) {
      this.authError.set(this.errorMessage(error));
    } finally {
      this.initialized.set(true);
    }
  }

  private async loadTracker(): Promise<void> {
    this.applyState(await this.api.getTracker<SavedState>());
    const account = this.api.account();
    const available = await this.api.migrationAvailable();
    const dismissed = account && window.localStorage.getItem(`daymark-migration-dismissed:${account.id}`) === 'true';
    this.migrationAvailable.set(available && !dismissed);
  }

  private applyState(state: SavedState): void {
    this.income.set(Number(state.income));
    this.currency.set(state.currency);
    this.categories.set(state.categories);
    this.expenses.set(state.expenses);
    this.hobbies.set(state.hobbies);
    this.hobbyLogs.set(state.hobbyLogs);
  }

  private currentState(): SavedState {
    return {
      income: this.income(),
      currency: this.currency(),
      categories: this.categories(),
      expenses: this.expenses(),
      hobbies: this.hobbies(),
      hobbyLogs: this.hobbyLogs(),
    };
  }

  private saveState(): void {
    if (!this.api.account()) return;
    const state = this.currentState();
    this.dataError.set('');
    this.saveQueue = this.saveQueue
      .then(async () => {
        await this.api.saveTracker(state);
      })
      .catch((error: unknown) => {
        this.dataError.set(this.errorMessage(error, 'Could not save your changes. Please try again.'));
      });
  }

  private async importLegacyState(state: SavedState, fromBrowser: boolean): Promise<void> {
    this.assertSavedState(state);
    this.dataError.set('');
    try {
      const imported = await this.api.importTracker<SavedState>(state);
      this.applyState(imported);
      this.migrationAvailable.set(false);
      if (fromBrowser) {
        window.localStorage.removeItem('daymark-tracker');
        this.legacyAvailable.set(false);
      }
      this.importFileSelected.set(false);
    } catch (error) {
      this.dataError.set(this.errorMessage(error, 'Could not import the saved data.'));
    }
  }

  private readLegacyState(): SavedState | null {
    const raw = window.localStorage.getItem('daymark-tracker');
    if (!raw) return null;
    try {
      const state = JSON.parse(raw) as SavedState;
      this.assertSavedState(state);
      return state;
    } catch {
      return null;
    }
  }

  private assertSavedState(value: SavedState): void {
    if (
      !value ||
      typeof value.income !== 'number' ||
      typeof value.currency !== 'string' ||
      !Array.isArray(value.categories) ||
      !Array.isArray(value.expenses) ||
      !Array.isArray(value.hobbies) ||
      !Array.isArray(value.hobbyLogs)
    ) {
      throw new Error('The file does not contain a valid Daymark data export.');
    }
  }

  private errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'Can’t reach the Daymark API. Start the backend and local services, then retry.';
      const message = error.error?.message ?? error.error?.detail;
      return typeof message === 'string' ? message : fallback;
    }
    return error instanceof Error ? error.message : fallback;
  }

}
