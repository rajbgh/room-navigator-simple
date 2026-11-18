const workspaceName = document.getElementById("workspaceName");
const connectionStatus = document.getElementById("connectionStatus");

let xapi;

window.addEventListener("load", init);

async function init() {
  try {
    xapi = await window.getXAPI();
    connectionStatus.textContent = "Connected";

    // Enable manual LED control through the RoomOS xAPI.
    await xapi.Config.UserInterface.LedControl.Mode.set("Manual");

    await updateWorkspaceName();
    await updateOccupancy();
    subscribeToOccupancy();
  } catch (error) {
    console.error("Unable to connect to the room device:", error);
    connectionStatus.textContent = "Unable to connect to room device";
  }
}

async function updateWorkspaceName() {
  try {
    const status = await xapi.Status.get();
    const accounts = status?.Webex?.DevicePersonalization?.Accounts;
    const fallbackAccounts = status?.Webex?.Accounts;
    const name = accounts?.[0]?.DisplayName || fallbackAccounts?.[0]?.DisplayName;

    workspaceName.textContent = name || "Workspace";
  } catch (error) {
    console.error("Unable to read workspace name:", error);
    workspaceName.textContent = "Workspace";
  }
}

async function updateOccupancy() {
  try {
    const count = Number(await xapi.Status.RoomAnalytics.PeopleCount.Current.get());

    // A negative value (commonly -1) means the sensor is unavailable.
    // Do not treat an unavailable reading as an empty room.
    if (!Number.isFinite(count) || count < 0) {
      connectionStatus.textContent = "People count unavailable";
      return;
    }

    await setRoomLed(count > 0 ? "Red" : "Green");
    connectionStatus.textContent = count > 0 ? "Occupied" : "Available";
  } catch (error) {
    console.error("Unable to read room occupancy:", error);
    connectionStatus.textContent = "Occupancy unavailable";
  }
}

function subscribeToOccupancy() {
  xapi.Status.RoomAnalytics.PeopleCount.Current.on(async (value) => {
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) return;

    await setRoomLed(count > 0 ? "Red" : "Green");
    connectionStatus.textContent = count > 0 ? "Occupied" : "Available";
  });
}

async function setRoomLed(color) {
  try {
    await xapi.Command.UserInterface.LedControl.Color.Set({ Color: color });
  } catch (error) {
    console.error("Unable to set LED color:", error);
    connectionStatus.textContent = "LED control unavailable";
  }
}
