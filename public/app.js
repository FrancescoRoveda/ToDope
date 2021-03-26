const auth = firebase.auth()
const provider = new firebase.auth.GoogleAuthProvider()

$(document).ready(function () {
    $("#login").on('click', function () {
        auth.signInWithPopup(provider)
    });
    $("#logout").on('click', function () {
        auth.signOut()
    })

    $("#addTask").on('click', function () {
        $('#addTaskModal').modal('show')
        inputSelector("today")
    })
});


auth.onAuthStateChanged(user => {
    if (user) {
        $("#loginContainer").hide();
        $("#dashboard").show();
        $("particles-js").remove()
    } else {
        console.log("not logged in");
        particlesJS.load('particles-js', '/static/js/particlesjs-config.json', function() {
            console.log('callback - particles.js config loaded');
        });
        $("#loginContainer").show();
        $("#dashboard").hide();
    }
})

var db = firebase.firestore();
if (location.hostname === "localhost") {
  db.useEmulator("localhost", 8080);
}

const thingsList = document.getElementById("taskListV2");
let thingsRef;
let unsubscribe;

function getDate(delay, Tasktime) {
    const d = new Date()
    d.setDate(d.getDate() + delay)
    if (Tasktime != null){
        splitted = Tasktime.split(":")
        d.setHours(splitted[0])
        d.setMinutes(splitted[1])
    }
    return firebase.firestore.Timestamp.fromDate(d)
}

function parseDate(date, Tasktime){
    return firebase.firestore.Timestamp.fromMillis(Date.parse(date + " " + Tasktime))
}

function inputSelector(id){
    $(".taskDate").each(function (){
        $(this).removeClass("taskDateActive")
    })
    if (id == "planned") {
        $("#inputDate").show()
        $("#inputTime").show()
    }else if (id == "anytime") {
        $("#inputDate").hide()
        $("#inputTime").hide()
    }else {
        $("#inputTime").show()
        $("#inputDate").hide()
    }
    $("#"+id).toggleClass('taskDateActive');
}

auth.onAuthStateChanged(user => {
    if (user) {
        $(".taskDate").on("click", function () {
            inputSelector(this.id)
        })

        thingsRef = db.collection('tasks')
        $("#submitTask").on('click', () => {
            var taskTime = $("#TaskTime").val()
            $(".taskDate").each(function () {
                if ($(this).hasClass("taskDateActive")) {
                    switch (this.id) {
                        case "today":
                            console.log("Adding task to today");
                            addToDb(getDate(0, taskTime))
                            break
                        case "tomorrow":
                            addToDb(getDate(1, taskTime))
                            break
                        case "planned":
                            addToDb(parseDate($("#taskPlannedDate").val(), taskTime))
                            break
                        case "anytime":
                            addToDb(null)
                            break
                    }
                }
                $(this).removeClass("taskDateActive")
            });
            $('#addTaskModal').modal('hide')
            $("#taskPlannedDate").val('');
            $("#TaskTime").val('');
            $("#taskName").val('');
        })

        function addToDb(dueDate) {
            //console.log("Adding task to db: "+ dueDate.seconds);
            const { serverTimestamp } = firebase.firestore.FieldValue;
            thingsRef.add({
                uid: user.uid,
                Name: $("#taskName").val(),
                DueDate: dueDate,
                Status: false,
                createdAt: serverTimestamp()
            })
        }

        $(document).ready(function() {
            displayTask()
        })

        $(".timeSelector").on('click', function () {
            $(".timeSelector").each(function () {
                $(this).removeClass('timeSelectorActive')
                thingsList.innerHTML = ""
            })
            $(this).addClass('timeSelectorActive')
            if (this.id != "selectorDone"){
                RenderTasks(this.id)
            }else{
                DoneTasks()
            }
        })

        function displayTask() {
            console.log("requests");
            unsubscribe = thingsRef
                .where('uid', '==', user.uid)
                .where("Status", "==", false)
                .orderBy("DueDate", "asc")
                .onSnapshot(querySnaposhot => {
                    window.items = querySnaposhot.docs
                    $(".timeSelector").each(function(){
                        if ($(this).hasClass("timeSelectorActive")){
                            RenderTasks(this.id)
                        }
                    })
                    
                })
        }

        function RenderTasks(date){
            const tableData = window.items.map(doc =>{
                if (doc.data().DueDate != null){
                    const dateObject = new Date(doc.data().DueDate.seconds * 1000)
                    if (date == "selectorToday" && doc.data().DueDate.seconds <= getDate(1, "00:00").seconds){
                        const humanDateFormat = dateObject.toLocaleString("en-US", {hour: "2-digit", minute: "2-digit", hour12: false});
                        return taskDiv(doc.id, doc.data().Name, humanDateFormat)
                    }
                    else if (date == "selectorTomorrow" && (doc.data().DueDate.seconds >= getDate(1, "00:00").seconds && doc.data().DueDate.seconds < getDate(2, "00:00").seconds)){
                        const humanDateFormat = dateObject.toLocaleString("en-US", {hour: "2-digit", minute: "2-digit", hour12: false});
                        return taskDiv(doc.id, doc.data().Name, humanDateFormat)
                    }
                    else if (date == "selectorPlanned" && doc.data().DueDate.seconds > getDate(2, "00:00").seconds){
                        const humanDateFormat = dateObject.toLocaleString("en-US", {year: 'numeric', month: 'long', day: 'numeric', hour: "2-digit", minute: "2-digit", hour12: false});
                        return taskDiv(doc.id, doc.data().Name, humanDateFormat)
                    }
                }
                else if (date == "selectorAnytime"){
                    return `
                            <div class="d-flex justify-content-start mb-4">
                                <div class="w-5"><a href="#" id="${doc.id}" class="removeTask"><i class="far fa-circle taskCircle" ></i></a></div>
                                <div class="w-50 align-self-center"><p class="mb-0">${doc.data().Name}</p></div>
                                <div class="w-25 align-self-center"><a href="#" class="btn btn-success">Work</a></div>
                                <div class="w-20 align-self-center"><a href="#" class="editTask" edit-id="${doc.id}">Edit</a></div>
                            </div>
                        `
                }
            })
            thingsList.innerHTML = tableData.join('')
        }

        function taskDiv(id, name, date) {
            return `
                <div class="d-flex justify-content-start my-5">
                    <div class="w-5"><a href="#" id="${id}" class="removeTask"><i class="far fa-circle taskCircle" ></i></a></div>
                    <div class="w-30 align-self-center"><p class="mb-0">${name}</p></div>
                    <div class="w-25 align-self-center"><a href="#" class="btn btn-success">Work</a></div>
                    <div class="w-20 align-self-center"><p class="mb-0">${date}</p></div>
                    <div class="w-20 align-self-center"><a href="#" class="editTask" edit-id="${id}">Edit</a></div>
                </div>
            `
        }

        function DoneTasks(){
            unsubscribe = thingsRef
                .where('uid', '==', user.uid)
                .where("Status", "==", true)
                .orderBy("DueDate", "asc")
                .onSnapshot(querySnaposhot => {
                    const done = querySnaposhot.docs.map(task =>{
                        const dateObject = new Date(task.data().DueDate.seconds * 1000)
                    return`
                        <div class="d-flex justify-content-start my-5">
                            <div class="w-10"><a href="#" id="${task.id}" class="reAddTask"><i class="fas fa-circle taskCircle" ></i></a></div>
                            <div class="w-30 align-self-center"><p class="mb-0">${task.data().Name}</p></div>
                            <div class="w-20 align-self-center"><a href="#" class="btn btn-success">Work</a></div>
                            <div class="w-20 align-self-center"><p class="mb-0">${dateObject.toLocaleString("en-EN", {year: 'numeric', month: 'long', day: 'numeric', hour: "2-digit", minute: "2-digit", hour12: false})}</p></div>
                            <div class="w-20 align-self-center"><a href="#" class="editTask">Edit</a></div>
                        </div>
                    `
                })
                thingsList.innerHTML = done.join('')
            })
        }

        $("#taskListV2").on('click', ".removeTask", function () {
            thingsRef.doc(this.id).update({
                uid: user.uid,
                Status: true
            });
        });
        $("#taskListV2").on('click', ".reAddTask", function () {
            thingsRef.doc(this.id).get({
                uid: user.uid,
                Status: false
            });
        });

        $("#taskListV2").on('click', ".editTask", function () {
            $('#addTaskModal').modal('show')
            const id = $(this).attr("edit-id")
            console.log(id);
            console.log(thingsRef.doc(id).get());
        });
        
        
        $("#openTagManager").on("click", function(){
            $('#tagManager').modal('show')

        })

    } else {
        unsubscribe && unsubscribe()
    }
})


