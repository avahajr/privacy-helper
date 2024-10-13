$(document).ready(function () {
    $("#selected-policy").hide();
    console.log('input.js loaded')
    $("#analyze-risks").on("click", function () {
        console.log("Analyzing risks...");
        window.location.href = '/results';
    });
    refreshUI();
    getAndLoadPolicy();
    $('[data-bs-toggle="tooltip"]').tooltip();

    $('.dropdown-item').on('click', function () {
        let selectedPolicy = $(this).text();
        updateSelectedPolicy(selectedPolicy);
        // console.log(selectedPolicy);
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
    $("#goal-suggest").on("click", function () {
        console.log("Suggesting goal...");
        $.ajax({
            url: "/gpt/suggest-goals",
            method: 'GET',
            success: function (data) {
                console.log(data);
                refreshUI()
            },
        });
    });

    function refreshUI() {
        let goals;
        $.ajax({
            url: '/goals',
            method: 'GET',
            success: function (data) {
                goals = data;
                $("#goal-list").empty();
                goals.forEach((goal, i) => {
                    const goalElement = $(`
                    <li data-id="${i}" class="goal-container list-group-item">
                        <div>
                            <i class="info-icon bi bi-question-circle" data-bs-toggle="modal" data-bs-target="#goalExplanationModal" data-explanation="${goal.explanation}"></i>
                            <span class="goal-text">${goal.goal}</span>
                        </div>
                        <i class="bi bi-trash remove-goal"></i>
                    </li>
                `);
                    $("#goal-list").append(goalElement);
                    goalElement.find(".info-icon").on("click", function () {
                        const explanation = goal.explanation.replace(/\*\*(.*?)\*\*/g, '<div><strong>$1</strong></div>');
                        $("#goalExplanationModalLabel").text(goal.goal);
                        $("#goalExplanationText").html(explanation);
                    });
                });

                const newGoalElement = $(`
                <li class="goal-container list-group-item input-group">
                    <input aria-label="enter new goal" id="new-goal" class="form-control" type="text" placeholder="type new goal here...">
                    <button class="btn btn-outline-success"><i class="bi bi-plus-lg"></i></button>
                </li>
            `);
                newGoalElement.on("keypress", function (e) {
                    if (e.key === "Enter") {
                        const newGoal = $("#new-goal").val();
                        addGoal(newGoal, "");
                        $("#new-goal").val("");
                    }
                });
                newGoalElement.find("button").on("click", function () {
                    const newGoal = $("#new-goal").val();
                    addGoal(newGoal, "");
                    $("#new-goal").focus()
                });
                $("#goal-list").append(newGoalElement);

                // attach event listeners
                $(".remove-goal").on("click", function () {
                    const goalId = $(this).parent().data("id");
                    // console.log("Goal ID:", goalId);
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
        if (goal === "") {
            return;
        }
        $.ajax({
            url: '/add/goal',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                goal: goal,
                explanation: explanation
            }),
            success: function (data) {
                // console.log(data);
                refreshUI()
                return data;
            },
            error: function () {
                console.log("Error adding goal.");
            }
        });
        $("#new-goal").val("");

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
                // console.log(data);
                refreshUI();
                $("#new-goal").focus();
                return data
            },
            error: function () {
                console.log("Error removing goal.");
                return {};
            }
        });
    }

    function getAndLoadPolicy() {
        $.ajax({
            url: '/policy',
            method: 'GET',
            success: function (data) {
                // console.log(data);
                let selectedPolicy = data['policy'];
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
            },
            error: function () {
                console.log("Error loading policy.");
                return {};
            }
        });
    }

    function updateSelectedPolicy(selectedPolicy) {
        $.ajax({
            url: '/policy',
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({
                policy: selectedPolicy
            }),
            success: function (data) {
                // console.log(data);
                getAndLoadPolicy();
                return data;
            },
            error: function () {
                console.log("Error updating policy.");
                return {};
            }
        });
    }
});