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
    })
});


auth.onAuthStateChanged(user => {
    if (user) {
        $("#loginContainer").hide();
        $("#dashboard").show();
    } else {
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


auth.onAuthStateChanged(user => {
    if (user) {
        $(".taskDate").on("click", function () {
            $(this).toggleClass('taskDateActive');
            if (this.id == "planned") {
                $("#taskPlannedDate").show()
            }
        })

        thingsRef = db.collection('tasks')
        $("#submitTask").on('click', () => {
            var taskTime = $("#TaskTime").val()
            $(".taskDate").each(function () {
                if ($(this).hasClass("taskDateActive")) {
                    switch (this.id) {
                        case "today":
                            addToDb(getDate(0, taskTime))
                            break
                        case "tomorrow":
                            addToDb(getDate(1, taskTime))
                            break
                        case "planned":
                            console.log("Adding planned task to db: "+$("#taskPlannedDate").val());
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
            console.log("Adding task to db: "+$("#taskName").val() + " "+ dueDate);
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
            RenderTasks(this.id)
        })

        async function displayTask(status = false) {
            console.log("requests");
            unsubscribe = thingsRef
                .where('uid', '==', user.uid)
                .where("Status", "==", status)
                .orderBy("DueDate", "asc")
                .onSnapshot(querySnaposhot => {
                    if  (!status){
                        window.items = querySnaposhot.docs
                        $(".timeSelector").each(function(){
                            if ($(this).hasClass("timeSelectorActive")){
                                RenderTasks(this.id)
                            }
                        })
                    }else{
                        console.log("status: "+ status);
                        console.log(querySnaposhot.docs);
                        return querySnaposhot.docs
                    }
                })
        }

        function RenderTasks(date){
            //console.log("Today: < "+getDate(0, "00:00").seconds)
            //console.log("Tomorrow: >"+  getDate(1, "00:00").seconds +" && < " + getDate(2, "00:00").seconds)
            //console.log("Planned: <"+  getDate(2, "00:00").seconds)
            //console.log("--------------------");

            const tableData = window.items.map(doc =>{
                if (doc.data().DueDate != null){
                    const dateObject = new Date(doc.data().DueDate.seconds * 1000)
                    if (date == "selectorToday" && doc.data().DueDate.seconds <= getDate(0, "00:00").seconds){
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
                    console.log("Anytime: "+doc.data().Name)
                    return `
                            <div class="d-flex justify-content-start mb-4">
                                <div class="w-5"><a href="#" id="${doc.id}" class="removeTask"><i class="far fa-circle taskCircle" ></i></a></div>
                                <div class="w-50 align-self-center"><p class="mb-0">${doc.data().Name}</p></div>
                            </div>
                        `
                }
            })
            thingsList.innerHTML = tableData.join('')
        }

        /*
        else if (date == "selectorDone"){
            console.log("Done task");
            done = displayTask(true).then(function(){
                done.map(task =>{
                    return`
                    <div class="d-flex justify-content-start my-5">
                    <div class="w-10"><a href="#" id="${task.id}" class="reAddTask"><i class="fas fa-circle taskCircle" ></i></a></div>
                    <div class="w-30 align-self-center"><p class="mb-0">${task.data().name}</p></div>
                    <div class="w-20 align-self-center"><a href="#" class="btn btn-success">Work</a></div>
                    <div class="w-20 align-self-center"><p class="mb-0">${task.data().date}</p></div>
                    <div class="w-20 align-self-center"><a href="#" class="editButton">Edit</a></div>
                    </div>
                    `
                })
            })
        }
        */
        function taskDiv(id, name, date) {
            return `
                <div class="d-flex justify-content-start my-5">
                    <div class="w-5"><a href="#" id="${id}" class="removeTask"><i class="far fa-circle taskCircle" ></i></a></div>
                    <div class="w-30 align-self-center"><p class="mb-0">${name}</p></div>
                    <div class="w-25 align-self-center"><a href="#" class="btn btn-success">Work</a></div>
                    <div class="w-20 align-self-center"><p class="mb-0">${date}</p></div>
                    <div class="w-20 align-self-center"><a href="#" class="editButton">Edit</a></div>
                </div>
            `
        }

        $("#taskListV2").on('click', ".removeTask", function () {
            thingsRef.doc(this.id).update({
                uid: user.uid,
                Status: true
            });
        });

        


    } else {
        unsubscribe && unsubscribe()
    }
})