import { useCallback, useEffect, useState } from "react";
import {
  Activity, ArrowUpRight, Bell, CalendarDays, Check, ChevronRight, CircleHelp,
  ClipboardList, Clock3, Heart, LayoutDashboard, LogOut, Menu, PawPrint, Pill,
  Plus, Settings2, ShieldCheck, Sparkles,
  Stethoscope, Trash2, X
} from "lucide-react";
import { api, friendlyDate } from "./api";

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "pets", label: "My pets", icon: PawPrint },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "prescriptions", label: "Prescriptions", icon: Pill },
  { id: "history", label: "Care history", icon: ClipboardList },
  { id: "assistant", label: "AI care assistant", icon: Sparkles }
];

const emptyData = { pets: [], appointments: [], prescriptions: [], history: [] };

function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P";
}

function petEmoji(species) {
  return species === "Cat" ? "🐈" : species === "Bird" ? "🐦" : species === "Rabbit" ? "🐇" : species === "Dog" ? "🐕" : "🐾";
}

function getErrorMessage(error) {
  if (error.status === 503 && error.message.includes("MONGODB_URI")) {
    return "Add your MongoDB connection string to .env to connect your account.";
  }
  return error.message;
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState(emptyData);
  const [activePage, setActivePage] = useState("overview");
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const loadData = useCallback(async () => {
    const [pets, appointments, prescriptions, history] = await Promise.all([
      api("/pets"),
      api("/appointments"),
      api("/prescriptions"),
      api("/history")
    ]);
    setData({
      pets: pets.pets,
      appointments: appointments.appointments,
      prescriptions: prescriptions.prescriptions,
      history: history.entries
    });
  }, []);

  useEffect(() => {
    api("/auth/me")
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        return loadData();
      })
      .catch((requestError) => {
        if (requestError.status !== 401) setError(getErrorMessage(requestError));
      })
      .finally(() => setAuthLoading(false));
  }, [loadData]);

  async function handleAuth(mode, values) {
    setBusy(true);
    setError("");
    try {
      const { user: currentUser } = await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(values)
      });
      setUser(currentUser);
      setError("");
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      throw requestError;
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      setData(emptyData);
      setActivePage("overview");
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function saveRecord(kind, values, id) {
    const routes = { pet: "/pets", appointment: "/appointments", prescription: "/prescriptions" };
    const path = `${routes[kind]}${id ? `/${id}` : ""}`;
    await api(path, {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(values)
    });
    await loadData();
    setModal(null);
    setNotice(id ? "Your changes have been saved." : "Added to your pet's care.");
  }

  async function deleteRecord(kind, id, label) {
    if (!window.confirm(`Delete this ${label}? This can't be undone.`)) return;
    const path = kind === "pet" ? `/pets/${id}` : `/${kind === "appointment" ? "appointments" : "prescriptions"}/${id}`;
    try {
      await api(path, { method: "DELETE" });
      await loadData();
      setNotice(`${label[0].toUpperCase()}${label.slice(1)} deleted.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function updateAppointmentStatus(appointment, status) {
    try {
      await api(`/appointments/${appointment._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (authLoading) {
    return <div className="loading-screen"><div className="brand-mark"><PawPrint size={21} /></div><span>Getting your care space ready…</span></div>;
  }
  if (!user) return <AuthScreen onSubmit={handleAuth} busy={busy} error={error} />;

  const page = navigation.find((item) => item.id === activePage) || navigation[0];
  const petCount = data.pets.length;
  const upcomingAppointments = data.appointments
    .filter((appointment) => appointment.status === "Upcoming" && new Date(appointment.scheduledAt) >= new Date())
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const activePrescriptions = data.prescriptions.filter((item) => !item.endDate || new Date(item.endDate) >= new Date());

  return (
    <div className="app-shell">
      {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><PawPrint size={21} strokeWidth={2.2} /></div>
          <div><span className="brand-name">pawcare</span><span className="brand-caption">PET WELLNESS</span></div>
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={19} /></button>
        </div>
        <div className="nav-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${activePage === id ? "nav-item-active" : ""}`} onClick={() => { setActivePage(id); setMobileNav(false); setError(""); }}>
              <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
              {id === "appointments" && upcomingAppointments.length > 0 && <span className="nav-count">{upcomingAppointments.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><Heart size={16} /></div>
            <p>Every little step counts.</p>
            <span>Keep your pet feeling their best with care that stays organized.</span>
            <button onClick={() => setActivePage("assistant")}>Explore care tips <ArrowUpRight size={14} /></button>
          </div>
          <button className="user-card" onClick={handleLogout}>
            <div className="user-avatar">{initials(user.name)}</div>
            <span className="user-details"><strong>{user.name}</strong><small>Pet parent</small></span>
            <LogOut size={17} className="logout-icon" />
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="breadcrumb"><span>My space</span><ChevronRight size={14} /><strong>{page.label}</strong></div>
          <div className="topbar-right">
            <span className="today-label">{new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span>
            <button className="top-icon" onClick={() => setActivePage("appointments")} aria-label="View appointments"><Bell size={18} />{upcomingAppointments.length > 0 && <i />}</button>
            <div className="top-avatar">{initials(user.name)}</div>
          </div>
        </header>

        <section className="content-wrap">
          {error && <div className="alert alert-error"><ShieldCheck size={17} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X size={16} /></button></div>}
          {notice && <div className="toast"><Check size={16} />{notice}</div>}
          {activePage === "overview" && <Overview user={user} data={data} upcoming={upcomingAppointments} activePrescriptions={activePrescriptions} onNavigate={setActivePage} onAdd={() => setModal({ kind: "pet" })} onManageAppointment={updateAppointmentStatus} />}
          {activePage === "pets" && <PetsPage pets={data.pets} onAdd={() => setModal({ kind: "pet" })} onEdit={(pet) => setModal({ kind: "pet", record: pet })} onDelete={(pet) => deleteRecord("pet", pet._id, pet.name)} />}
          {activePage === "appointments" && <AppointmentsPage appointments={data.appointments} onAdd={() => setModal({ kind: "appointment" })} onEdit={(record) => setModal({ kind: "appointment", record })} onStatus={updateAppointmentStatus} onDelete={(record) => deleteRecord("appointment", record._id, "appointment")} hasPets={petCount > 0} onAddPet={() => setModal({ kind: "pet" })} />}
          {activePage === "prescriptions" && <PrescriptionsPage prescriptions={data.prescriptions} onAdd={() => setModal({ kind: "prescription" })} onEdit={(record) => setModal({ kind: "prescription", record })} onDelete={(record) => deleteRecord("prescription", record._id, "prescription")} hasPets={petCount > 0} onAddPet={() => setModal({ kind: "pet" })} />}
          {activePage === "history" && <HistoryPage entries={data.history} />}
          {activePage === "assistant" && <AssistantPage pets={data.pets} />}
        </section>
        <footer className="page-footer"><span>Made with care, for the ones who make life better.</span><span><ShieldCheck size={14} /> Your pet's information is private</span></footer>
      </main>
      {modal && <RecordModal key={`${modal.kind}-${modal.record?._id || "new"}`} kind={modal.kind} record={modal.record} pets={data.pets} onClose={() => setModal(null)} onSave={(values) => saveRecord(modal.kind, values, modal.record?._id)} />}
    </div>
  );
}

function AuthScreen({ onSubmit, busy, error }) {
  const [mode, setMode] = useState("register");
  const [formError, setFormError] = useState("");
  const [values, setValues] = useState({ name: "", email: "", password: "" });

  async function submit(event) {
    event.preventDefault();
    setFormError("");
    try { await onSubmit(mode, values); }
    catch (requestError) { setFormError(requestError.message); }
  }

  return (
    <main className="auth-page">
      <div className="auth-art">
        <div className="auth-art-top"><div className="brand-mark"><PawPrint size={21} /></div><span>pawcare</span></div>
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
        <div className="art-illustration"><div className="sun-disc" /><span className="art-paw">🐾</span><div className="art-caption"><span>A little more peace of mind.</span><strong>Care that keeps up<br />with every wag.</strong></div></div>
        <div className="art-bottom"><span>Thoughtful care, all in one place.</span><span>01 — 03</span></div>
      </div>
      <div className="auth-form-side">
        <div className="auth-topline"><span>YOUR PET'S HAPPY PLACE</span><div className="auth-top-icon"><Heart size={18} /></div></div>
        <div className="auth-form-wrap">
          <div className="auth-kicker"><span className="tiny-paw"><PawPrint size={13} /></span> A softer way to stay on top of care</div>
          <h1>{mode === "register" ? "Care for them,\nall in one place." : "Welcome\nback."}</h1>
          <p className="auth-subtitle">{mode === "register" ? "Create your account and keep all the little things that matter close." : "Sign in to pick up right where you left off."}</p>
          <form onSubmit={submit} className="auth-form">
            {mode === "register" && <label>Your name<input autoComplete="name" required maxLength={80} placeholder="e.g. Jamie Parker" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /></label>}
            <label>Email address<input type="email" autoComplete="email" required placeholder="you@example.com" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></label>
            <label>Password<input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={8} required placeholder="At least 8 characters" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} /></label>
            {(formError || error) && <div className="auth-error">{formError || error}</div>}
            <button className="button button-dark auth-submit" disabled={busy}>{busy ? "One moment…" : mode === "register" ? "Create my account" : "Sign in"}<ChevronRight size={17} /></button>
          </form>
          <p className="auth-switch">{mode === "register" ? "Already have an account?" : "New to PawCare?"} <button onClick={() => { setMode(mode === "register" ? "login" : "register"); setFormError(""); }}>{mode === "register" ? "Sign in" : "Create an account"}</button></p>
          <div className="auth-privacy"><ShieldCheck size={15} /> Your account and pet information stay private.</div>
        </div>
        <div className="auth-footer"><span>PAWCARE · PET WELLNESS</span><span>Here for every little moment.</span></div>
      </div>
    </main>
  );
}

function SectionHeading({ eyebrow, title, description, action, actionLabel = "Add new", actionIcon: ActionIcon = Plus }) {
  return <div className="section-heading">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action && <button className="button button-dark" onClick={action}><ActionIcon size={16} />{actionLabel}</button>}
  </div>;
}

function Overview({ user, data, upcoming, activePrescriptions, onNavigate, onAdd, onManageAppointment }) {
  const firstName = user.name.split(/\s+/)[0];
  const next = upcoming[0];
  return <>
    <div className="welcome-strip">
      <div className="welcome-copy"><div className="eyebrow eyebrow-light">A FRESH LOOK AT THEIR CARE</div><h1>Good to see you, {firstName}<span className="wave">✳</span></h1><p>A little organization goes a long way. Here's what's happening with your crew.</p></div>
      <div className="welcome-art" aria-hidden="true"><div className="welcome-circle"><span>🐕</span></div><div className="welcome-spark spark-a">✳</div><div className="welcome-spark spark-b">✦</div><div className="welcome-dot" /></div>
    </div>
    <div className="overview-grid">
      <div className="metric-card"><div className="metric-top"><span>YOUR CREW</span><span className="metric-icon peach"><PawPrint size={17} /></span></div><div className="metric-value">{data.pets.length}<span>{data.pets.length === 1 ? "pet" : "pets"}</span></div><div className="metric-bottom"><span>{data.pets.length ? "Looking good, little one." : "Your care journey starts here."}</span><button onClick={() => onNavigate("pets")}>View crew <ArrowUpRight size={14} /></button></div></div>
      <div className="metric-card"><div className="metric-top"><span>UP NEXT</span><span className="metric-icon lilac"><CalendarDays size={17} /></span></div><div className="metric-value">{upcoming.length}<span>{upcoming.length === 1 ? "visit" : "visits"}</span></div><div className="metric-bottom"><span>{next ? `${friendlyDate(next.scheduledAt, { month: "short", day: "numeric" })} · ${next.pet?.name || "Your pet"}` : "Nothing on the calendar."}</span><button onClick={() => onNavigate("appointments")}>View schedule <ArrowUpRight size={14} /></button></div></div>
      <div className="metric-card"><div className="metric-top"><span>MEDICATIONS</span><span className="metric-icon mint"><Pill size={17} /></span></div><div className="metric-value">{activePrescriptions.length}<span>active</span></div><div className="metric-bottom"><span>{activePrescriptions.length ? "A little reminder goes a long way." : "No active medications saved."}</span><button onClick={() => onNavigate("prescriptions")}>View list <ArrowUpRight size={14} /></button></div></div>
    </div>
    <div className="dashboard-columns">
      <section className="panel upcoming-panel">
        <div className="panel-heading"><div><div className="eyebrow">ON THE CALENDAR</div><h2>Coming up</h2></div><button className="text-link" onClick={() => onNavigate("appointments")}>All appointments <ChevronRight size={15} /></button></div>
        {upcoming.length ? <div className="appointment-list">{upcoming.slice(0, 3).map((item) => <AppointmentRow key={item._id} item={item} onStatus={onManageAppointment} />)}</div> : <EmptyState icon={CalendarDays} title="Nothing planned just yet" text="Add a check-up or appointment to keep it on your radar." action="Schedule a visit" onClick={() => onNavigate("appointments")} />}
        <button className="add-inline" onClick={() => onNavigate("appointments")}><Plus size={15} /> Add an appointment</button>
      </section>
      <section className="panel crew-panel">
        <div className="panel-heading"><div><div className="eyebrow">THE ONES YOU LOVE</div><h2>Your crew</h2></div><button className="round-add" onClick={onAdd} aria-label="Add pet"><Plus size={17} /></button></div>
        {data.pets.length ? <div className="crew-list">{data.pets.slice(0, 3).map((pet, index) => <div className="crew-item" key={pet._id}><div className={`pet-avatar pet-tone-${index % 4}`}>{petEmoji(pet.species)}</div><div className="crew-info"><strong>{pet.name}</strong><span>{[pet.breed || pet.species, pet.age ? `${pet.age} ${pet.age === 1 ? "year" : "years"}` : ""].filter(Boolean).join(" · ")}</span></div><span className="pet-status"><i /> In your care</span></div>)}</div> : <EmptyState icon={PawPrint} title="Who's in your crew?" text="Add a pet profile to start keeping their care organized." action="Add a pet" onClick={onAdd} />}
        {data.pets.length > 0 && <button className="add-inline" onClick={() => onNavigate("pets")}><span>See all {data.pets.length} {data.pets.length === 1 ? "pet" : "pets"}</span><ChevronRight size={15} /></button>}
      </section>
    </div>
    <section className="assistant-banner"><div className="assistant-banner-icon"><Sparkles size={20} /></div><div className="assistant-banner-copy"><span>HERE WHEN YOU NEED A HAND</span><strong>A question about their everyday care?</strong><small>Get general pet-care information with your choice of AI provider.</small></div><button className="button button-outline" onClick={() => onNavigate("assistant")}>Ask the care assistant <ArrowUpRight size={15} /></button><div className="banner-decoration">✳</div></section>
  </>;
}

function AppointmentRow({ item, onStatus }) {
  const date = new Date(item.scheduledAt);
  const time = Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return <div className="appointment-row">
    <div className="date-tile"><strong>{Number.isNaN(date.getTime()) ? "--" : date.getDate()}</strong><span>{Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}</span></div>
    <div className="appointment-info"><strong>{item.reason}</strong><span>{item.pet?.name || "Pet"} · {item.clinic}</span><small><Clock3 size={12} /> {time}</small></div>
    <div className="appointment-actions"><span className="status-pill status-upcoming">Upcoming</span><button className="tiny-action" title="Mark completed" onClick={() => onStatus(item, "Completed")}><Check size={15} /></button></div>
  </div>;
}

function EmptyState({ icon: Icon, title, text, action, onClick }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={20} /></div><strong>{title}</strong><p>{text}</p>{action && <button className="text-link" onClick={onClick}>{action}<ArrowUpRight size={14} /></button>}</div>;
}

function PetsPage({ pets, onAdd, onEdit, onDelete }) {
  return <>
    <SectionHeading eyebrow="THE ONES YOU LOVE" title="Your pets" description="Keep their details close and all of their care in one place." action={onAdd} actionLabel="Add a pet" />
    {pets.length ? <div className="pet-grid">{pets.map((pet, index) => <article className="pet-card" key={pet._id}>
      <div className={`pet-card-art pet-tone-${index % 4}`}><div className="pet-big-emoji">{petEmoji(pet.species)}</div><span className="pet-kind">{pet.species}</span><button className="card-menu" onClick={() => onDelete(pet)} aria-label={`Delete ${pet.name}`}><Trash2 size={16} /></button></div>
      <div className="pet-card-body"><div className="pet-name-row"><div><h2>{pet.name}</h2><p>{pet.breed || `${pet.species} · Breed not added`}</p></div><button className="icon-button edit-icon" onClick={() => onEdit(pet)} aria-label={`Edit ${pet.name}`}><Settings2 size={17} /></button></div>
        <div className="pet-facts"><div><span>AGE</span><strong>{pet.age ? `${pet.age} ${pet.age === 1 ? "year" : "years"}` : "Not added"}</strong></div><div><span>WEIGHT</span><strong>{pet.weight ? `${pet.weight} kg` : "Not added"}</strong></div><div><span>SEX</span><strong>{pet.sex || "Unknown"}</strong></div></div>
        {pet.notes && <p className="pet-notes">{pet.notes}</p>}
      </div>
    </article>)}
      <button className="add-pet-card" onClick={onAdd}><div><Plus size={20} /></div><strong>Add another best friend</strong><span>Start a new pet profile</span></button>
    </div> : <div className="large-empty"><EmptyState icon={PawPrint} title="Your crew starts here" text="Add your pet's profile to keep their appointments, medication, and care history organized." action="Add your first pet" onClick={onAdd} /></div>}
  </>;
}

function AppointmentsPage({ appointments, onAdd, onEdit, onStatus, onDelete, hasPets, onAddPet }) {
  const sorted = [...appointments].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  return <>
    <SectionHeading eyebrow="A LITTLE TIME FOR THEIR HEALTH" title="Appointments" description="Plan their visits and keep notes for next time." action={hasPets ? onAdd : onAddPet} actionLabel={hasPets ? "Schedule a visit" : "Add a pet first"} actionIcon={hasPets ? Plus : PawPrint} />
    {!hasPets ? <div className="large-empty"><EmptyState icon={PawPrint} title="Add a pet to get started" text="Appointments are linked to a pet profile, so you can keep every visit in the right place." action="Add a pet" onClick={onAddPet} /></div> : sorted.length ? <div className="table-card"><div className="table-heading"><span>VISIT</span><span>DATE & TIME</span><span>VETERINARIAN</span><span>STATUS</span><span /></div>
      {sorted.map((item) => <div className="table-row" key={item._id}><div className="table-main"><div className="table-icon calendar-soft"><Stethoscope size={18} /></div><div><strong>{item.reason}</strong><span>{item.pet?.name || "Pet"} · {item.clinic}</span></div></div><div className="table-cell">{friendlyDate(item.scheduledAt)}<small>{new Date(item.scheduledAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></div><div className="table-cell">{item.veterinarian || "Not specified"}</div><div><select aria-label={`Status for ${item.reason}`} className={`status-select status-${item.status.toLowerCase()}`} value={item.status} onChange={(event) => onStatus(item, event.target.value)}><option>Upcoming</option><option>Completed</option><option>Cancelled</option></select></div><div className="row-actions"><button title="Edit appointment" onClick={() => onEdit(item)}><Settings2 size={16} /></button><button title="Delete appointment" onClick={() => onDelete(item)}><Trash2 size={16} /></button></div></div>)}
    </div> : <div className="large-empty"><EmptyState icon={CalendarDays} title="A clear calendar—for now" text="When you have a check-up or visit booked, add it here to keep the details handy." action="Schedule a visit" onClick={onAdd} /></div>}
  </>;
}

function PrescriptionsPage({ prescriptions, onAdd, onEdit, onDelete, hasPets, onAddPet }) {
  const sorted = [...prescriptions].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  return <>
    <SectionHeading eyebrow="THE LITTLE DETAILS THAT MATTER" title="Prescriptions" description="Keep medication instructions and dates easy to find." action={hasPets ? onAdd : onAddPet} actionLabel={hasPets ? "Add a prescription" : "Add a pet first"} actionIcon={hasPets ? Plus : PawPrint} />
    {!hasPets ? <div className="large-empty"><EmptyState icon={PawPrint} title="Add a pet to get started" text="You'll be able to keep prescriptions connected to the pet they're for." action="Add a pet" onClick={onAddPet} /></div> : sorted.length ? <div className="prescription-grid">{sorted.map((item) => {
      const isActive = !item.endDate || new Date(item.endDate) >= new Date();
      return <article className="prescription-card" key={item._id}><div className="prescription-top"><div className="prescription-icon"><Pill size={19} /></div><span className={`status-pill ${isActive ? "status-active" : "status-completed"}`}>{isActive ? "Active" : "Completed"}</span><button className="row-icon-button" onClick={() => onDelete(item)} aria-label="Delete prescription"><Trash2 size={16} /></button></div>
        <h2>{item.medication}</h2><span className="prescription-for">For {item.pet?.name || "your pet"}</span><div className="medication-detail"><span>DOSAGE</span><strong>{item.dosage}</strong></div><div className="medication-detail"><span>HOW OFTEN</span><strong>{item.frequency}</strong></div><div className="medication-detail"><span>DATES</span><strong>{friendlyDate(item.startDate)}{item.endDate ? ` — ${friendlyDate(item.endDate)}` : " — ongoing"}</strong></div>{item.instructions && <p className="medication-notes">{item.instructions}</p>}{item.veterinarian && <div className="prescribed-by"><Stethoscope size={14} /> Prescribed by {item.veterinarian}</div>}<button className="edit-prescription" onClick={() => onEdit(item)}>Edit details <ArrowUpRight size={14} /></button>
      </article>;
    })}</div> : <div className="large-empty"><EmptyState icon={Pill} title="No prescriptions saved" text="Save the instructions from your veterinarian's prescription so they're easy to find later." action="Add a prescription" onClick={onAdd} /></div>}
  </>;
}

function HistoryPage({ entries }) {
  return <>
    <SectionHeading eyebrow="THE LITTLE THINGS ADD UP" title="Care history" description="A timeline of visits and prescriptions saved for your pets." />
    {entries.length ? <div className="history-card"><div className="history-timeline">{entries.map((entry, index) => <div className="history-entry" key={`${entry.type}-${entry.id}`}><div className={`history-marker ${entry.type === "Appointment" ? "marker-appointment" : "marker-prescription"}`}>{entry.type === "Appointment" ? <Stethoscope size={15} /> : <Pill size={15} />}</div><div className="history-content"><div className="history-meta"><span>{entry.type}</span><time>{friendlyDate(entry.date)}</time></div><h3>{entry.title}</h3><p>{entry.detail}</p>{entry.notes && <p className="history-notes">{entry.notes}</p>}<small>For {entry.pet}</small></div>{index < entries.length - 1 && <div className="history-line" />}</div>)}</div></div> : <div className="large-empty"><EmptyState icon={ClipboardList} title="Their story starts here" text="Completed visits and saved prescriptions will show up in this timeline." /></div>}
  </>;
}

function AssistantPage({ pets }) {
  const [provider, setProvider] = useState("openrouter");
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("");
  const [modelStatus, setModelStatus] = useState("");
  const [question, setQuestion] = useState("");
  const [petId, setPetId] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerMeta, setAnswerMeta] = useState(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  const selectedPet = pets.find((pet) => pet._id === petId);
  const fetchModels = useCallback(async () => {
    setLoadingModels(true);
    setModelStatus("");
    setError("");
    try {
      const result = await api(`/ai/models?provider=${provider}`);
      const recommended = new Set(result.starterModels);
      const options = result.models.length
        ? result.models.map((item) => ({ ...item, recommended: recommended.has(item.id) }))
          .sort((a, b) => Number(b.recommended) - Number(a.recommended))
        : result.starterModels.map((id) => ({ id, name: id, recommended: true }));
      setModels(options);
      setModel((current) => options.some((item) => item.id === current) ? current : (options[0]?.id || ""));
      setModelStatus(result.models.length ? `${result.models.length} models available` : "Showing suggested models");
    } catch (requestError) {
      const options = (requestError.starterModels || []).map((id) => ({ id, name: id, recommended: true }));
      setModels(options);
      setModel((current) => options.some((item) => item.id === current) ? current : (options[0]?.id || ""));
      setModelStatus(options.length ? "Suggested models · add your API key to refresh" : "");
      setError(requestError.message);
    } finally {
      setLoadingModels(false);
    }
  }, [provider]);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  async function ask(event) {
    event.preventDefault();
    if (!question.trim()) return setError("Write a question first.");
    if (!model) return setError("Choose a model to continue.");
    setAsking(true);
    setError("");
    setAnswer("");
    setAnswerMeta(null);
    try {
      const context = selectedPet ? `Pet context: ${selectedPet.name}, a ${selectedPet.age ? `${selectedPet.age}-year-old ` : ""}${selectedPet.breed || selectedPet.species}${selectedPet.weight ? `, ${selectedPet.weight} kg` : ""}.\n\n` : "";
      const result = await api("/ai/suggest", {
        method: "POST",
        body: JSON.stringify({ provider, model, question: `${context}${question.trim()}` })
      });
      setAnswer(result.answer);
      setAnswerMeta(`${result.provider} · ${result.model}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAsking(false);
    }
  }

  return <>
    <SectionHeading eyebrow="A HELPFUL STARTING POINT" title="AI care assistant" description="Ask general pet-care questions and get thoughtful information to discuss with your vet." />
    <div className="ai-layout">
      <div className="ai-main">
        <div className="ai-welcome"><div className="ai-orb"><Sparkles size={23} /></div><div><span>HERE TO HELP YOU THINK IT THROUGH</span><h2>What would you like to know?</h2><p>Get everyday pet-care information grounded in your question and, optionally, your pet's profile.</p></div></div>
        <form className="ai-form" onSubmit={ask}>
          <label className="field-label">ABOUT WHICH PET? <span>OPTIONAL</span></label>
          <select value={petId} onChange={(event) => setPetId(event.target.value)}><option value="">General question</option>{pets.map((pet) => <option key={pet._id} value={pet._id}>{pet.name} · {pet.species}</option>)}</select>
          <label className="field-label question-label" htmlFor="ai-question">YOUR QUESTION</label>
          <textarea id="ai-question" maxLength={3000} rows={5} placeholder="For example: What should I bring to my puppy's first vet visit?" value={question} onChange={(event) => setQuestion(event.target.value)} />
          <div className="question-count">{question.length} / 3,000</div>
          {error && <div className="inline-error">{error}</div>}
          <div className="ai-submit-row"><span><ShieldCheck size={15} /> Your question is only sent to the provider you select.</span><button className="button button-dark" disabled={asking || !model}>{asking ? <><span className="button-spinner" /> Thinking…</> : <><Sparkles size={16} /> Get suggestions</>}</button></div>
        </form>
        {answer && <div className="answer-card"><div className="answer-heading"><div className="answer-icon"><Sparkles size={17} /></div><div><strong>A few things to consider</strong><span>{answerMeta}</span></div><button className="icon-button" onClick={() => { setAnswer(""); setAnswerMeta(null); }} aria-label="Dismiss answer"><X size={17} /></button></div><div className="answer-body">{answer}</div><div className="answer-note"><CircleHelp size={15} /> This is general information, not a diagnosis. Your veterinarian is the best person to advise on your pet's health.</div></div>}
      </div>
      <aside className="ai-settings-card"><div className="settings-title"><div className="settings-icon"><Settings2 size={17} /></div><div><strong>AI preferences</strong><span>Choose how your answer is generated</span></div></div><label className="field-label">AI PROVIDER</label><div className="provider-options">
        <button className={`provider-option ${provider === "openrouter" ? "provider-selected" : ""}`} onClick={() => { setProvider("openrouter"); setAnswer(""); }}><span className="provider-dot openrouter-dot">O</span><span><strong>OpenRouter</strong><small>Choose from many models</small></span><span className="radio-dot" /></button>
        <button className={`provider-option ${provider === "nvidia" ? "provider-selected" : ""}`} onClick={() => { setProvider("nvidia"); setAnswer(""); }}><span className="provider-dot nvidia-dot">N</span><span><strong>NVIDIA</strong><small>Models hosted by NVIDIA</small></span><span className="radio-dot" /></button>
      </div><div className="model-label-row"><label className="field-label" htmlFor="model-select">MODEL</label><button className="refresh-models" onClick={fetchModels} disabled={loadingModels}>{loadingModels ? <span className="button-spinner" /> : <Activity size={13} />} Refresh</button></div><select id="model-select" value={model} onChange={(event) => setModel(event.target.value)} disabled={!models.length}>{models.map((item) => <option value={item.id} key={item.id}>{item.name}{item.recommended ? " · suggested" : ""}</option>)}</select><small className="model-status">{modelStatus || "Set a provider API key to load available models."}</small><div className="ai-safety-note"><ShieldCheck size={16} /><p><strong>A helpful companion, not a veterinarian.</strong> For urgent symptoms or medical decisions, contact a licensed veterinary professional.</p></div></aside>
    </div>
    <div className="suggested-prompts"><span>NOT SURE WHERE TO START?</span>{["How can I make vet visits less stressful?", "What should I ask at an annual check-up?", "What are some everyday enrichment ideas?"].map((prompt) => <button key={prompt} onClick={() => setQuestion(prompt)}>{prompt}<ArrowUpRight size={13} /></button>)}</div>
  </>;
}

const formFields = {
  pet: [
    { name: "name", label: "Pet's name", required: true, placeholder: "e.g. Olive", maxLength: 60 },
    { name: "species", label: "Species", type: "select", required: true, options: ["Dog", "Cat", "Bird", "Rabbit", "Other"] },
    { name: "breed", label: "Breed", placeholder: "e.g. Golden retriever" },
    { name: "age", label: "Age (years)", type: "number", min: 0, max: 100 },
    { name: "sex", label: "Sex", type: "select", options: ["Female", "Male", "Unknown"] },
    { name: "weight", label: "Weight (kg)", type: "number", min: 0, max: 1000, step: "0.1" },
    { name: "notes", label: "Notes", type: "textarea", placeholder: "Anything you'd like to remember about their care…" }
  ],
  appointment: [
    { name: "pet", label: "Pet", type: "pet-select", required: true },
    { name: "reason", label: "Visit type", required: true, placeholder: "e.g. Annual check-up", maxLength: 160 },
    { name: "clinic", label: "Clinic", required: true, placeholder: "Clinic or practice name", maxLength: 120 },
    { name: "veterinarian", label: "Veterinarian", placeholder: "Optional", maxLength: 80 },
    { name: "scheduledAt", label: "Date & time", type: "datetime-local", required: true },
    { name: "status", label: "Status", type: "select", options: ["Upcoming", "Completed", "Cancelled"] },
    { name: "notes", label: "Notes", type: "textarea", placeholder: "Questions to ask or notes from the visit…" }
  ],
  prescription: [
    { name: "pet", label: "Pet", type: "pet-select", required: true },
    { name: "medication", label: "Medication", required: true, placeholder: "Medication name", maxLength: 120 },
    { name: "dosage", label: "Dosage", required: true, placeholder: "As written on the prescription", maxLength: 120 },
    { name: "frequency", label: "How often", required: true, placeholder: "e.g. Once daily", maxLength: 120 },
    { name: "startDate", label: "Start date", type: "date", required: true },
    { name: "endDate", label: "End date", type: "date" },
    { name: "veterinarian", label: "Prescribed by", placeholder: "Optional", maxLength: 80 },
    { name: "instructions", label: "Instructions", type: "textarea", placeholder: "Instructions exactly as provided by your veterinarian…" }
  ]
};

function inputDate(value, type) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (type === "datetime-local") {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
  return date.toISOString().slice(0, 10);
}

function RecordModal({ kind, record, pets, onClose, onSave }) {
  const [values, setValues] = useState(() => Object.fromEntries(formFields[kind].map((field) => {
    let value = record?.[field.name];
    if (field.type === "pet-select" && typeof value === "object") value = value?._id;
    if (field.type === "date" || field.type === "datetime-local") value = inputDate(value, field.type);
    return [field.name, value ?? ""];
  })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const title = `${record ? "Edit" : "Add"} ${kind === "pet" ? "pet" : kind === "appointment" ? "appointment" : "prescription"}`;

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = { ...values };
    ["age", "weight"].forEach((field) => { if (payload[field] !== undefined) payload[field] = payload[field] === "" ? 0 : Number(payload[field]); });
    if (payload.endDate === "") payload.endDate = null;
    try { await onSave(payload); }
    catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div className="modal-heading"><div><div className="eyebrow">A LITTLE MORE ABOUT THEIR CARE</div><h2 id="modal-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>
    <form onSubmit={submit}><div className="modal-fields">{formFields[kind].map((field) => <label key={field.name} className={`modal-field ${field.type === "textarea" ? "modal-field-wide" : ""}`}>{field.label}{field.type === "textarea" ? <textarea maxLength={field.maxLength || 2000} rows={3} placeholder={field.placeholder} value={values[field.name]} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} /> : field.type === "select" ? <select required={field.required} value={values[field.name]} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}><option value="">Choose one</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : field.type === "pet-select" ? <select required value={values.pet} onChange={(event) => setValues({ ...values, pet: event.target.value })}><option value="">Choose a pet</option>{pets.map((pet) => <option value={pet._id} key={pet._id}>{pet.name} · {pet.species}</option>)}</select> : <input type={field.type || "text"} required={field.required} min={field.min} max={field.max} step={field.step} maxLength={field.maxLength} placeholder={field.placeholder} value={values[field.name]} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />}</label>)}</div>
      {error && <div className="inline-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-dark" disabled={saving}>{saving ? "Saving…" : record ? "Save changes" : "Save to my care"}<ChevronRight size={16} /></button></div>
    </form>
  </section></div>;
}

export default App;
