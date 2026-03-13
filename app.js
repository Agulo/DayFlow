let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

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
        task: task
    };

    tasks.push(newTask);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    displayTasks();
}

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