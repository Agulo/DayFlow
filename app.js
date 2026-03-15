let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// Alarm sound
let alarmSound = new Audio("alarm.mp3");

// Ask permission for notifications
if ("Notification" in window) {
    Notification.requestPermission();
}

// Send notification
function sendNotification(message) {
    if (Notification.permission === "granted") {
        new Notification("Life Schedule Reminder", {
            body: message,
            icon: "icon.png"
        });
    }
}

// Check if it's a new day and reset tasks
function checkAndResetDaily() {
    const lastDate = localStorage.getItem("lastDate");
    const today = new Date().toDateString();
    
    if (lastDate !== today) {
        tasks = [];
        localStorage.setItem("tasks", JSON.stringify(tasks));
        localStorage.setItem("lastDate", today);
    }
}

function addTask(){
    let time = document.getElementById("time").value;
    let task = document.getElementById("task").value;

    let newTask = {
        time: time,
        task: task,
        notified: false
    };

    tasks.push(newTask);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    displayTasks();
}

document.body.addEventListener("click", function(){
    alarmSound.play().then(()=>alarmSound.pause()).catch(()=>{});
}, {once:true});

function displayTasks(){
    let list = document.getElementById("list");
    list.innerHTML = "";

    tasks.forEach(function(t, index){
        let item = document.createElement("li");
        item.innerText = t.time + " - " + t.task;

        let deleteBtn = document.createElement("button");
        deleteBtn.innerText = "Delete";

        deleteBtn.onclick = function(){
            deleteTask(index);
        };

        item.appendChild(deleteBtn);
        list.appendChild(item);
    });
}

function deleteTask(index){
    tasks.splice(index,1);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    displayTasks();
}

// Check tasks every 30 seconds
function checkTasks() {
    let now = new Date();
    let currentTime =
        String(now.getHours()).padStart(2,'0') + ":" +
        String(now.getMinutes()).padStart(2,'0');

    tasks.forEach(function(t, index){
        if (t.time === currentTime && !t.notified) {

            sendNotification(t.task);

            // PLAY ALARM SOUND
            alarmSound.play();

            tasks[index].notified = true;
            localStorage.setItem("tasks", JSON.stringify(tasks));
        }
    });
}

setInterval(checkTasks, 30000);

// Hide splash screen after animation
window.addEventListener('load', function() {
    setTimeout(function() {
        const splashScreen = document.getElementById('splashScreen');
        if (splashScreen) {
            splashScreen.style.display = 'none';
        }
    }, 3000);
});

// Check for daily reset on page load
checkAndResetDaily();
displayTasks();