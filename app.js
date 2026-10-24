"use strict";

const STORAGE_KEY = "mini-it-support-tickets";
const STATUSES = ["Open", "In Progress", "Resolved"];

const ticketForm = document.querySelector("#ticket-form");
const ticketList = document.querySelector("#ticket-list");
const ticketSearch = document.querySelector("#ticket-search");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyCopy = document.querySelector("#empty-copy");
const ticketTotal = document.querySelector("#ticket-total");
const appMessage = document.querySelector("#app-message");

let tickets = loadTickets();

ticketForm.addEventListener("submit", handleTicketSubmit);
ticketSearch.addEventListener("input", renderTickets);
ticketList.addEventListener("change", handleTicketStatusChange);
ticketList.addEventListener("click", handleTicketDelete);

renderTickets();

function loadTickets() {
  try {
    const storedTickets = localStorage.getItem(STORAGE_KEY);

    if (storedTickets === null) {
      return [];
    }

    const parsedTickets = JSON.parse(storedTickets);
    if (!Array.isArray(parsedTickets) || !parsedTickets.every(isTicket)) {
      throw new Error("Stored ticket data has an invalid format.");
    }

    return parsedTickets;
  } catch (error) {
    console.error("Unable to load saved tickets.", error);
    announce("Saved tickets couldn't be loaded. The list starts empty.");
    return [];
  }
}

function isTicket(ticket) {
  return ticket !== null
    && typeof ticket === "object"
    && typeof ticket.id === "string"
    && typeof ticket.title === "string"
    && typeof ticket.requester === "string"
    && typeof ticket.category === "string"
    && typeof ticket.priority === "string"
    && typeof ticket.description === "string"
    && STATUSES.includes(ticket.status)
    && typeof ticket.createdAt === "string";
}

function handleTicketSubmit(event) {
  event.preventDefault();

  if (!ticketForm.reportValidity()) {
    return;
  }

  const formData = new FormData(ticketForm);
  const ticket = {
    id: createTicketId(),
    title: String(formData.get("title")).trim(),
    requester: String(formData.get("requester")).trim(),
    category: String(formData.get("category")),
    priority: String(formData.get("priority")),
    description: String(formData.get("description")).trim(),
    status: "Open",
    createdAt: new Date().toISOString()
  };

  if (!ticket.title || !ticket.requester || !ticket.description) {
    announce("Please complete all required fields before creating a ticket.");
    return;
  }

  tickets.unshift(ticket);
  const saved = persistTickets();
  ticketForm.reset();
  ticketSearch.value = "";
  renderTickets();
  announce(saved ? "Ticket created." : "Ticket created, but couldn't be saved in this browser.");
  document.querySelector("#title").focus();
}

function createTicketId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function handleTicketStatusChange(event) {
  const statusSelect = event.target.closest("[data-ticket-status]");
  if (!statusSelect) {
    return;
  }

  const ticket = tickets.find((item) => item.id === statusSelect.dataset.ticketStatus);
  if (!ticket || !STATUSES.includes(statusSelect.value)) {
    return;
  }

  ticket.status = statusSelect.value;
  const saved = persistTickets();
  renderTickets();
  announce(saved
    ? `Ticket status changed to ${ticket.status}.`
    : "Ticket status changed, but couldn't be saved in this browser.");
}

function handleTicketDelete(event) {
  const deleteButton = event.target.closest("[data-ticket-delete]");
  if (!deleteButton) {
    return;
  }

  const ticket = tickets.find((item) => item.id === deleteButton.dataset.ticketDelete);
  if (!ticket || !window.confirm(`Delete "${ticket.title}"? This action cannot be undone.`)) {
    return;
  }

  tickets = tickets.filter((item) => item.id !== ticket.id);
  const saved = persistTickets();
  renderTickets();
  announce(saved ? "Ticket deleted." : "Ticket deleted, but the change couldn't be saved in this browser.");
}

function persistTickets() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    return true;
  } catch (error) {
    console.error("Unable to save tickets.", error);
    return false;
  }
}

function renderTickets() {
  updateStatusCounts();

  const query = ticketSearch.value.trim().toLocaleLowerCase();
  const visibleTickets = tickets.filter((ticket) => (
    ticket.title.toLocaleLowerCase().includes(query)
    || ticket.requester.toLocaleLowerCase().includes(query)
  ));

  ticketList.replaceChildren(...visibleTickets.map(createTicketCard));
  ticketTotal.textContent = String(tickets.length);
  emptyState.hidden = visibleTickets.length > 0;
  ticketList.hidden = visibleTickets.length === 0;

  if (tickets.length === 0) {
    emptyTitle.textContent = "It's quiet in here";
    emptyCopy.textContent = "No tickets yet. Create a request to get the conversation started.";
  } else if (visibleTickets.length === 0) {
    emptyTitle.textContent = "No matching tickets";
    emptyCopy.textContent = "Try a different title or requester name.";
  }
}

function updateStatusCounts() {
  document.querySelector("#count-open").textContent = String(
    tickets.filter((ticket) => ticket.status === "Open").length
  );
  document.querySelector("#count-progress").textContent = String(
    tickets.filter((ticket) => ticket.status === "In Progress").length
  );
  document.querySelector("#count-resolved").textContent = String(
    tickets.filter((ticket) => ticket.status === "Resolved").length
  );
}

function createTicketCard(ticket) {
  const card = document.createElement("article");
  card.className = "ticket-card";
  if (ticket.priority === "High") {
    card.classList.add("priority-high");
  }
  if (ticket.status !== "Resolved") {
    card.classList.add("unresolved");
  }

  const topLine = document.createElement("div");
  topLine.className = "ticket-topline";

  const labels = document.createElement("div");
  labels.className = "ticket-labels";
  labels.append(
    createChip(ticket.category, "category"),
    createChip(ticket.priority, `priority-${ticket.priority.toLowerCase()}`)
  );
  topLine.append(labels, createText("time", formatDate(ticket.createdAt), "ticket-date"));

  const title = createText("h3", ticket.title, "ticket-title");
  const requester = createText("p", `Requested by ${ticket.requester}`, "ticket-requester");
  const description = createText("p", ticket.description, "ticket-description");

  const bottomLine = document.createElement("div");
  bottomLine.className = "ticket-bottomline";

  const statusControl = document.createElement("div");
  statusControl.className = "status-control";
  const statusId = `status-${ticket.id}`;
  const statusLabel = createText("label", "Status", "");
  statusLabel.htmlFor = statusId;
  const statusSelect = document.createElement("select");
  statusSelect.id = statusId;
  statusSelect.className = `status-select status-${ticket.status.toLowerCase().replaceAll(" ", "-")}`;
  statusSelect.dataset.ticketStatus = ticket.id;
  statusSelect.setAttribute("aria-label", `Status for ${ticket.title}`);

  for (const status of STATUSES) {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    option.selected = status === ticket.status;
    statusSelect.append(option);
  }

  statusControl.append(statusLabel, statusSelect);

  const deleteButton = createText("button", "Delete", "delete-button");
  deleteButton.type = "button";
  deleteButton.dataset.ticketDelete = ticket.id;
  deleteButton.setAttribute("aria-label", `Delete ticket: ${ticket.title}`);
  bottomLine.append(statusControl, deleteButton);
  card.append(topLine, title, requester, description, bottomLine);

  return card;
}

function createChip(text, className) {
  return createText("span", text, `ticket-chip ${className}`);
}

function createText(tagName, text, className) {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) {
    element.className = className;
  }
  return element;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function announce(message) {
  appMessage.textContent = message;
}