const { EventEmitter } = require("events");

const eventBus = new EventEmitter();

eventBus.on("violation.created", (event) => {
  console.debug("violation.created", event.violationId);
});
eventBus.on("violation.status_changed", (event) => {
  console.debug("violation.status_changed", event.violationId);
});

module.exports = { eventBus };
