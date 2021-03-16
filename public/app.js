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


const db = firebase.firestore();
const thingsList = document.getElementById("taskList");
let thingsRef;
let unsubscribe;



function getDate(delay) {
    const d = new Date()
    d.setDate(d.getDate() + delay);
    const yy = new Intl.DateTimeFormat('en', {
        year: 'numeric'
    }).format(d)
    const mm = new Intl.DateTimeFormat('en', {
        month: '2-digit'
    }).format(d)
    const dd = new Intl.DateTimeFormat('en', {
        day: '2-digit'
    }).format(d)
    return `${yy}-${mm}-${dd}`
}




auth.onAuthStateChanged(user => {
    if (user) {
        $(".taskTime").on("click", function () {
            $(this).toggleClass('taskTimeActive');
            if (this.id == "planned") {
                $("#TaskDate").toggle()
            }
        })


        function addToDb(dueDate) {
            const {
                serverTimestamp
            } = firebase.firestore.FieldValue;
            thingsRef.add({
                uid: user.uid,
                Name: $("#taskName").val(),
                DueDate: dueDate,
                Status: false,
                createdAt: serverTimestamp()
            })
        }

        thingsRef = db.collection('tasks')
        $("#submitTask").on('click', () => {
            $(".taskTime").each(function () {
                if ($(this).hasClass("taskTimeActive")) {
                    switch (this.id) {
                        case "today":
                            addToDb(getDate(0))
                            break
                        case "tomorrow":
                            addToDb(getDate(1))
                            break
                        case "planned":
                            addToDb($("#TaskDate").val())
                            break
                        case "anytime":
                            addToDb("00-00-00")
                            break
                    }
                }
                $(this).removeClass("taskTimeActive")
            });
            $('#addTaskModal').modal('hide')
        })

        $(document).ready(function() {
            displayTask(getDate(0), "==")
        })

        $(".timeSelector").on('click', function () {
            $(".timeSelector").each(function () {
                $(this).removeClass('timeSelectorActive')
                thingsList.innerHTML = ""
            })
            $(this).addClass('timeSelectorActive')
            console.log(this.id);
            switch (this.id) {
                case "selectorToday":
                    console.log("Today");
                    displayTask(getDate(0), "==")
                    break
                case "selectorTomorrow":
                    console.log("Tomorrow");
                    displayTask(getDate(1), "==")
                    break
                case "selectorPlanned":
                    console.log("Planned");
                    displayTask(getDate(1), ">")
                    break
                case "selectorAnytime":
                    console.log("Anytime");
                    displayTask("00-00-00", "==")
                    break
                case "selectorDone":
                    console.log("done");
                    displayTask("0000-00-00", ">", true)
                    break
            }
        })

        function displayTask(SelectorDate, symbol, status = false) {
            unsubscribe = thingsRef
                .where('uid', '==', user.uid)
                .where("Status", "==", status)
                .where("DueDate", `${symbol}`, SelectorDate)
                .onSnapshot(querySnaposhot => {
                    const items = querySnaposhot.docs.map(doc => {
                        var dateAr = doc.data().DueDate.split('-');
                        var newDate = dateAr[2] + '.' + dateAr[1] + '.' + dateAr[0].slice(-2);
                        if (SelectorDate == "00-00-00"){
                            displayDate = "style='display:none'"
                        }else{
                            displayDate = ""
                        }

                        if (status){
                            faEdition = "fas"
                        }else{
                            faEdition = "far"
                        }
                        return `
                    <tr>
                    <td class="w-10"><a href="#" id="${doc.id}" class="removeTask"><i class="${faEdition} fa-circle taskCircle" ></i></a></td>
                    <td class="w-50 "><p style="text-align: left;">${doc.data().Name}</p></td>
                    <td class="w-40" ${displayDate}><p><i class="fas fa-arrow-right"></i> ${newDate}</p></td>
                    </tr>
                    `
                    })
                    thingsList.innerHTML = items.join('')
                })
        }



        $("#taskList").on('click', ".removeTask", function () {
            thingsRef.doc(this.id).update({
                uid: user.uid,
                Status: true
            });
        });

    } else {
        unsubscribe && unsubscribe()
    }
})