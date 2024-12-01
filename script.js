// script.js

// At the top of your script.js
const notificationSound = new Audio("./notification.mp3");

function setupNotifications(medicines) {
  // Check permissions first
  if (!("Notification" in window)) {
    alert("This browser does not support notifications");
    return;
  }

  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }

  // Clear any existing intervals
  if (window.notificationInterval) {
    clearInterval(window.notificationInterval);
  }

  window.notificationInterval = setInterval(() => {
    checkMedicines(medicines);
  }, 30000); // Check every 30 seconds
}

function checkMedicines(medicines) {
  const now = new Date();
  const currentDay = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][now.getDay()];
  const currentTime = now.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  medicines.forEach((medicine) => {
    if (medicine.days.includes(currentDay)) {
      medicine.times.forEach((time) => {
        // Compare current time with medicine time
        if (time === currentTime) {
          notifyUser(medicine);
        }
      });
    }
  });
}

// Add this to ensure notification permissions are requested when page loads
document.addEventListener("DOMContentLoaded", () => {
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Request notification permission
  if ("Notification" in window) {
    Notification.requestPermission();
  }

  const medicineForm = document.getElementById("medicineForm");
  const timesPerDay = document.getElementById("timesPerDay");
  const timeInputs = document.getElementById("timeInputs");
  const medicinesList = document.getElementById("medicinesList");

  // Load medicines from localStorage
  loadMedicines();

  // Handle times per day change
  timesPerDay.addEventListener("change", (e) => {
    const count = parseInt(e.target.value);
    updateTimeInputs(count);
  });

  // Handle form submission
  medicineForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveMedicine();
  });

  function updateTimeInputs(count) {
    const timeInputsDiv = document.getElementById("timeInputs");
    timeInputsDiv.innerHTML = "<label>Time:</label>";

    for (let i = 0; i < count; i++) {
      const timeInput = document.createElement("div");
      timeInput.className = "time-input";
      timeInput.innerHTML = `<input type="time" class="medicine-time" required>`;
      timeInputsDiv.appendChild(timeInput);
    }
  }

  function saveMedicine() {
    const patientName = document.getElementById("patientName").value;
    const medicineName = document.getElementById("medicineName").value;
    const mealRelation = document.querySelector(
      'input[name="mealRelation"]:checked'
    )?.value;
    const dosage = document.getElementById("dosage").value;
    const selectedDays = [
      ...document.querySelectorAll(".days-selector input:checked"),
    ].map((checkbox) => checkbox.value);
    const times = [...document.querySelectorAll(".medicine-time")].map(
      (input) => input.value
    );

    const medicine = {
      id: Date.now(),
      patName: patientName,
      name: medicineName,
      mealRelation: mealRelation,
      dosage: dosage,
      days: selectedDays,
      times: times,
    };

    // Save to localStorage
    const medicines = JSON.parse(localStorage.getItem("medicines") || "[]");
    medicines.push(medicine);
    localStorage.setItem("medicines", JSON.stringify(medicines));

    // Reset form
    medicineForm.reset();
    updateTimeInputs(1);

    // Reload medicines list
    loadMedicines();
  }

  function loadMedicines() {
    const medicines = JSON.parse(localStorage.getItem("medicines") || "[]");

    // Sort medicines by id (timestamp) in descending order
    const sortedMedicines = medicines.sort((a, b) => b.id - a.id);

    medicinesList.innerHTML = sortedMedicines
      .map(
        (medicine) => `
            <div class="medicine-item">
                <h3>Patient Name: ${medicine.patName}</h3>
                <h3>Medicine Name: ${medicine.name}</h3>
                <p>Dosage: ${medicine.dosage}</p>
                <p>Meal Relation: ${medicine.mealRelation}</p>
                <p>Days: ${medicine.days.join(", ")}</p>
                <p>Times: ${medicine.times.join(", ")}</p>
                <button id='deleteBtn' onclick="deleteMedicine(${
                  medicine.id
                })">Delete</button>
            </div>
        `
      )
      .join("");

    // Set up notifications for each medicine
    setupNotifications(sortedMedicines);
  }

  function setupNotifications(medicines) {
    setInterval(() => {
      const now = new Date();
      const currentDay = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][now.getDay()];
      const currentTime = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

      medicines.forEach((medicine) => {
        if (medicine.days.includes(currentDay)) {
          medicine.times.forEach((time) => {
            if (time === currentTime) {
              notifyUser(medicine);
            }
          });
        }
      });
    }, 60000); // Check every minute
  }

  // Add to window object to make it accessible from HTML
  window.deleteMedicine = function (id) {
    const medicines = JSON.parse(localStorage.getItem("medicines") || "[]");
    const updatedMedicines = medicines.filter((medicine) => medicine.id !== id);
    localStorage.setItem("medicines", JSON.stringify(updatedMedicines));
    loadMedicines();
  };
});

// Define notifyUser function once, outside event listener
async function notifyUser(medicine) {
  if (Notification.permission === "granted") {
    // Update the notification play code inside notifyUser function
    try {
      // Load and play notification sound
      notificationSound.load(); // Reset the audio
      notificationSound.volume = 1.0; // Set volume to maximum
      await notificationSound.play().catch((error) => {
        console.error("Failed to play notification sound:", error);
        // Fallback to browser default notification sound if available
        if ("AudioContext" in window) {
          const audioContext = new AudioContext();
          audioContext.createOscillator().connect(audioContext.destination);
        }
      });
    } catch (error) {
      console.error("Audio system error:", error);
      // Show alert with error details
      alert(`Hey, ${medicine.patName}, It's your time to take ${medicine.name} - ${medicine.dosage}, Make sure to take it ${medicine.mealRelation}`);
      notificationSound.play();
    }

    // Create notification
    const notification = new Notification("Medicine Reminder", {
      body: `Hey, ${medicine.patName}, It's your time to take ${medicine.name} - ${medicine.dosage}, Make sure to take it ${medicine.mealRelation}`,
      icon: "https://cdn-icons-png.flaticon.com/512/172/172011.png",
      badge: "https://cdn-icons-png.flaticon.com/512/172/172011.png",
      requireInteraction: true, // Notification will persist until user interacts
    });

    // Handle notification click
    notification.onclick = function () {
      window.focus();
      this.close();
    };

    // Store in localStorage that this notification was shown
    const notificationLog = JSON.parse(
      localStorage.getItem("notificationLog") || "[]"
    );
    notificationLog.push({
      medicineId: medicine.id,
      time: new Date().toISOString(),
    });
    localStorage.setItem("notificationLog", JSON.stringify(notificationLog));
  }
}
