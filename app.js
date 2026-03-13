let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

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

displayTasks();