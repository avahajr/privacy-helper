$(document).ready(function () {
    $("#selected-policy").hide();
    console.log('main.js loaded')

    let goals = $.ajax({
        url: '/goals',
        method: 'GET',
        success: function (data) {
            console.log(data);
            return data;
        },
        error: function () {
            console.log("Error loading goals.");
            return [];
        }
    });

    refreshUI(goals);
    // Set default policy to Apple
    let defaultPolicy = "Apple";
    // $("#dropdown-menu").text(`${defaultPolicy}.txt`);
    $("#selected-policy-title").text(`${defaultPolicy}'s Privacy Policy`);
    $("#selected-policy-text").text("Loading...");
    $.ajax({
        url: `static/policies/${defaultPolicy.toLowerCase()}.txt`,
        method: 'GET',
        success: function (data) {
            $("#selected-policy-text").text(data);
        },
        error: function () {
            $("#selected-policy-text").text("Error loading policy content.");
        }
    });
    $("#selected-policy").show();


    $('.dropdown-item').on('click', function () {
        let selectedPolicy = $(this).text();
        console.log(selectedPolicy);
        // Show the selected policy
        $("#dropdown-menu").text(`${selectedPolicy.toLowerCase()}.txt`);
        $("#selected-policy-title").text(`${selectedPolicy}'s Privacy Policy`);
        $.ajax({
            url: `static/policies/${selectedPolicy.toLowerCase()}.txt`,
            method: 'GET',
            success: function (data) {
                $("#selected-policy-text").text(data);
            },
            error: function () {
                $("#selected-policy-text").text("Error loading policy content.");
            }
        });
        $("#selected-policy").show();
    });


});

function refreshUI() {
    let goals;
    $.ajax({
        url: '/goals',
        method: 'GET',
        success: function (data) {
            console.log(data);
            goals = data;
            $("#goal-list").empty();
            console.log("Goals:", goals);
            goals.forEach((goal, i) => {
                const goalElement = $(`
            <li data-id="${i}" class="goal-container list-group-item">
                <div><i class="info-icon bi bi-question-circle"></i><span class="goal-text">${goal.goal}</span></div>
                <i class="bi bi-trash remove-goal"></i>
            </li>
        `);
                $("#goal-list").append(goalElement);
            });

            const newGoalElement = $(`
        <li class="goal-container list-group-item input-group">
            <input aria-label="enter new goal" id="new-goal" class="form-control" type="text" placeholder="type new goal here...">
            <button class="btn btn-outline-success"><i class="bi bi-plus-lg"></i></button>
        </li>
    `);
            $("#goal-list").append(newGoalElement);

            // attach event listeners
            $(".remove-goal").on("click", function () {
                const goalId = $(this).parent().data("id");
                console.log("Goal ID:", goalId);
                removeGoal(goalId);

            });
            return data;
        },
        error: function () {
            console.log("Error loading goals.");
            goals = [];
            return [];
        }
    });
}

function addGoal(goal, explanation) {
    $.ajax({
        url: '/add/goal',
        method: 'POST',
        data: {
            goal: goal,
            explanation: explanation
        },
        success: function (data) {
            console.log(data);
            refreshUI()
            return data;
        },
        error: function () {
            console.log("Error adding goal.");
        }
    });
}

function removeGoal(goalId) {
    $.ajax({
        url: '/remove/goal',
        method: 'DELETE',
        contentType: 'application/json',
        data: JSON.stringify({
            goalId: goalId
        }),
        success: function (data) {
            console.log(data);
            refreshUI();
            return data
        },
        error: function () {
            console.log("Error removing goal.");
            return {};
        }
    });
}