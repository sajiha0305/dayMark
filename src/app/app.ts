import { afterNextRender, Component, signal } from '@angular/core';

type DashboardPage = 'overview' | 'budget' | 'hobbies';

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
  protected readonly Math = Math;
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
    afterNextRender(() => this.restoreState());
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

  private restoreState(): void {
    const saved = window.localStorage.getItem('daymark-tracker');
    if (!saved) return;
    try {
      const state = JSON.parse(saved) as Partial<SavedState>;
      if (typeof state.income === 'number') this.income.set(state.income);
      if (typeof state.currency === 'string') this.currency.set(state.currency);
      if (Array.isArray(state.categories)) this.categories.set(state.categories);
      if (Array.isArray(state.expenses)) this.expenses.set(state.expenses);
      if (Array.isArray(state.hobbies)) this.hobbies.set(state.hobbies);
      if (Array.isArray(state.hobbyLogs)) this.hobbyLogs.set(state.hobbyLogs);
    } catch {
      window.localStorage.removeItem('daymark-tracker');
    }
  }

  private saveState(): void {
    const state: SavedState = {
      income: this.income(),
      currency: this.currency(),
      categories: this.categories(),
      expenses: this.expenses(),
      hobbies: this.hobbies(),
      hobbyLogs: this.hobbyLogs(),
    };
    window.localStorage.setItem('daymark-tracker', JSON.stringify(state));
  }
}
