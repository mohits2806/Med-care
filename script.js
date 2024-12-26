// At the top of your script.js
const notificationSound = new Audio("./notification.mp3");

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
      // Show alert with error details
      alert(
        `Hey, ${medicine.patName}, It's your time to take ${medicine.name} - ${medicine.dosage}, Make sure to take it ${medicine.mealRelation}`
      );
      notificationSound.play();
    }

    if (window.innerWidth < 600) {
      alert(
        `Hey, ${medicine.patName}, It's your time to take ${medicine.name} - ${medicine.dosage}, Make sure to take it ${medicine.mealRelation}`
      );
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

document.addEventListener("DOMContentLoaded", () => {
  // Check if Notifications are supported
  if (!("Notification" in window)) {
    alert("This browser does not support notifications");
    return;
  }

  // Request notification permission on page load
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }

  // Select DOM elements
  const medicineForm = document.getElementById("medicineForm");
  const timesPerDayInput = document.getElementById("timesPerDay");
  const timeInputsDiv = document.getElementById("timeInputs");
  const medicinesList = document.getElementById("medicinesList");
  const increaseBtn = document.getElementById("increase");
  const decreaseBtn = document.getElementById("decrease");
  const frequencySelect = document.getElementById("frequency");

  // Load medicines from localStorage on page load
  loadMedicines();

  // Handle increase button click
  increaseBtn.addEventListener("click", () => {
    let currentValue = parseInt(timesPerDayInput.value, 10);
    timesPerDayInput.value = currentValue + 1;
    updateTimeInputs(currentValue + 1);
  });

  // Handle decrease button click
  decreaseBtn.addEventListener("click", () => {
    let currentValue = parseInt(timesPerDayInput.value, 10);
    if (currentValue > 1) {
      timesPerDayInput.value = currentValue - 1;
      updateTimeInputs(currentValue - 1);
    }
  });

  // Handle times per day change manually (if user edits the number input)
  timesPerDayInput.addEventListener("input", (e) => {
    let count = parseInt(e.target.value, 10);
    if (isNaN(count) || count < 1) {
      count = 1;
      timesPerDayInput.value = count;
    }
    updateTimeInputs(count);
  });

  // Handle frequency change
  frequencySelect.addEventListener("change", (e) => {
    const frequency = e.target.value;
  });

  // Initialize time inputs
  updateTimeInputs(parseInt(timesPerDayInput.value, 10));

  // Handle form submission
  medicineForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveMedicine();
  });
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
  const patientName = document.getElementById("patientName").value.trim();
  const medicineName = document.getElementById("medicineName").value.trim();
  const mealRelation = document.querySelector(
    'input[name="mealRelation"]:checked'
  )?.value;
  const dosage = document.getElementById("dosage").value.trim();
  const frequency = document.getElementById("frequency").value;

  // Determine selected days based on frequency
  let selectedDays = [];
  if (frequency === "Everyday") {
    selectedDays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
  } else {
    // Capitalize the first letter to match day names
    selectedDays = [
      frequency.charAt(0).toUpperCase() + frequency.slice(1).toLowerCase(),
    ];
  }

  const times = [...document.querySelectorAll(".medicine-time")].map(
    (input) => input.value
  );

  // Validation
  if (
    !patientName ||
    !medicineName ||
    !mealRelation ||
    !dosage ||
    selectedDays.length === 0 ||
    times.length === 0
  ) {
    alert("Please fill in all required fields.");
    return;
  }

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
  document.getElementById("medicineForm").reset();
  updateTimeInputs(1);

  // Reload medicines list
  loadMedicines();
}

function loadMedicines() {
  const medicines = JSON.parse(localStorage.getItem("medicines") || "[]");

  // Sort medicines by id (timestamp) in descending order
  const sortedMedicines = medicines.sort((a, b) => b.id - a.id);

  const medicinesList = document.getElementById("medicinesList");
  medicinesList.innerHTML = sortedMedicines
    .map(
      (medicine) => `
            <div class="medicine-item">
                <h3>Patient Name: ${medicine.patName}</h3>
                <h3>Medicine Name: ${medicine.name}</h3>
                <p>Dosage: ${medicine.dosage}</p>
                <p>Meal Relation: ${medicine.mealRelation}</p>
                <p>Days: ${
                  medicine.days.length === 7
                    ? "Everyday"
                    : medicine.days.join(", ")
                }</p>
                <p>Times: ${medicine.times.join(", ")}</p>
                <button onclick="deleteMedicine(${
                  medicine.id
                })" id="deleteBtn">Delete</button>
            </div>
        `
    )
    .join("");

  // Set up notifications for each medicine
  setupNotifications(sortedMedicines);
}

function deleteMedicine(id) {
  const medicines = JSON.parse(localStorage.getItem("medicines") || "[]");
  const updatedMedicines = medicines.filter((medicine) => medicine.id !== id);
  localStorage.setItem("medicines", JSON.stringify(updatedMedicines));
  loadMedicines();
}

function setupNotifications(medicines) {
  // Clear any existing intervals
  if (window.notificationInterval) {
    clearInterval(window.notificationInterval);
  }

  window.notificationInterval = setInterval(() => {
    checkMedicines(medicines);
  }, 60000); // Check every minute

  // Initial check
  checkMedicines(medicines);
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
        if (time === currentTime) {
          notifyUser(medicine);
        }
      });
    }
  });
}
