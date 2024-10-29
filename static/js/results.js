$(document).ready(function () {
    rerollUI();
    $("#reroll").click(function () { rerollUI()});
    function constructGoalListItem(goal) {
        const summary_paragraphs = goal.gpt_summary.split('\n');
        return $(`
        <li class="goal-container list-group-item">
            <div>
                <span class="goal-achievement-level">${goal.rating}</span>
                <h4 class="goal-text">${goal.goal}</h4>
                ${summary_paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')}
            </div>
        </li>
    `);
    }

    function initPlaceholders() {
        let summary_row = $("#summary-row");
        let themes = ["not-met", "partially-met", "completely-met"];
        for (let i = 0; i < 3; i++) {
            summary_row.append(`
            <div class="col-4">
                <div class="card card-${themes[i]} w-100">
                    <div class="card-body">
                        <i class="bi placeholder w-25"></i>
                        <div id='goals-${themes[i]}' class="h3">
                            <div class="placeholder-glow">
                                <span class="placeholder col-12 w-75"></span>
                            </div>
                        </div>
                        <div class="placeholder-glow">
                            <span class="placeholder col-12"></span>
                        </div>
                    </div>
                </div>
            </div>`);

        }
        $("#percent-compliance").html(`
        <div class="placeholder-glow">
            <span class="placeholder col-1"></span>
        </div>
        <div class="placeholder-glow">
            <span class="placeholder col-5"></span>
        </div>
    `);
    }

    function fillDashboardPlaceholders(count_failure, count_warning, count_success) {
        const themes = ["not-met", "partially-met", "completely-met"];
        const icons = ["bi-x-circle-fill", "bi-exclamation-triangle-fill", "bi-check-circle-fill"];
        const texts = ["Goals not met", "Goals partially met", "Goals completely met"];

        themes.forEach((theme, index) => {
            const goalDashboard = $(`#goals-${theme}`)
            goalDashboard.parent().find('i').removeClass('placeholder').addClass(icons[index]);
            goalDashboard.parent().find('.placeholder-glow').remove();
            goalDashboard.parent().append(`<div>${texts[index]}</div>`);
        });

        let percent_compliance = Math.round((count_success / (count_warning + count_failure + count_success)) * 100);
        let reaction = "Ruh roh!"

        if (percent_compliance >= 50 && percent_compliance < 75) {
            reaction = "Not too shabby!"
        } else if (percent_compliance >= 75) {
            reaction = "Nice!"
        }

        $("#percent-compliance").html(`<strong>${reaction}</strong> <div><span>${percent_compliance}</span>% of your goals were completely met.</div>`);

        $("#goals-completely-met").empty().append($(`<div class='bold h3'>${count_success}</div>`));
        $("#goals-partially-met").empty().append($(`<div class='bold h3'>${count_warning}</div>`));
        $("#goals-not-met").empty().append($(`<div class='bold h3'>${count_failure}</div>`));

        $("#percent-compliance span").text(`${percent_compliance}`);
    }

    // Function to highlight text in the policy and scroll to it
    function highlightText(quoteText) {
        const policyTextElement = $("#selected-policy-text");
        const policyText = policyTextElement.text();
        const regex = new RegExp(`(${quoteText.trim()})`, 'gi');
        const highlightedText = policyText.replace(regex, '<span class="highlight">$1</span>');
        policyTextElement.html(highlightedText);

        // Scroll to the highlighted text
        const highlightedElement = policyTextElement.find(".highlight").first();
        if (highlightedElement.length) {
            policyTextElement.scrollTop(highlightedElement.position().top + policyTextElement.scrollTop());
        }
    }

    function populatePrivacyGoals(goals) {
        const $privacyGoalsList = $("#privacy-goals-list");
        $privacyGoalsList.empty(); // Clear any existing goals

        goals.forEach((goal, i) => {
            let icons = ["bi-x", "bi-exclamation-triangle", "bi-check"];
            let colors = ["text-danger", "text-warning", "text-success"];
            const goalItem = $(`
                <li data-id="${i}" class="list-group-item d-flex justify-content-between align-items-center">

                    <div class="d-flex align-items-center">
                        <i class="bi ${icons[goal['rating']]} ${colors[goal['rating']]}  pe-1"></i>
                        <div class="goal-text">${goal.goal}</div>
                    </div>

                    <i class="bi bi-pencil-square" title="edit goal"></i>
                </li>
            `);
            $privacyGoalsList.append(goalItem);
        });
        $privacyGoalsList.append($(`<li class="list-group-item input-group d-flex justify-content-between">
            <input aria-label="enter new goal" id="new-goal" class="form-control" type="text"
                   placeholder="type new goal here...">
            <button class="btn btn-outline-success"><i class="bi bi-plus-lg"></i></button>
        </li>`))
    }

    // Function to calculate the width of the text
    function getTextWidth(text, font) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        context.font = font;
        const metrics = context.measureText(text);
        return metrics.width;
    }

    // Attach event listener for pencil icon
    $("#privacy-goals-list").on('click', '.bi-pencil-square', function () {
        const $goalItem = $(this).closest('li');
        const $goalText = $goalItem.find('.goal-text');
        const goalId = $goalItem.data('id');
        const originalText = $goalText.text();

        // Check if input field already exists
        if ($goalText.find('input').length > 0) {
            return;
        }

        // Replace goal text with input field
        $goalText.html(`<input type="text" class="form-control" value="${originalText}" />`);
        const $input = $goalText.find('input');

        // Set the width of the input field based on the text length
        const font = $input.css("font");
        const textWidth = getTextWidth(originalText, font);
        $input.width(textWidth + 20); // Add some padding

        // Focus on the input field and place cursor at the end
        $input.focus();
        $input[0].setSelectionRange($input.val().length, $input.val().length);

        // Handle input field events
        $input.on('blur keydown input', function (e) {
            if (e.type === 'blur' || (e.type === 'keydown' && e.key === 'Enter')) {
                const newText = $input.val();
                if (newText !== originalText) {
                    // Update goal via AJAX
                    $.ajax({
                        url: '/update/goal',
                        method: 'PUT',
                        contentType: 'application/json',
                        data: JSON.stringify({goalId: goalId, newGoal: newText}),
                        success: function (data) {
                            // Update the goal text with the new value
                            $goalText.text(newText);
                        },
                        error: function () {
                            // Revert to original text on error
                            $goalText.text(originalText);
                            console.log("Error updating goal.");
                        }
                    });
                } else {
                    $goalText.text(originalText);
                }
            } else if (e.type === 'input') {
                // Adjust the width of the input field as the user types
                const newText = $input.val();
                const newTextWidth = getTextWidth(newText, font);
                $input.width(newTextWidth + 20); // Add some padding
            }
        });

    });

    function rerollUI() {
        $("#summary-row").empty();
        initPlaceholders();
        $.ajax({
            url: "/goals", method: 'GET', success: function (data) {
                console.log(data);
                populatePrivacyGoals(data);
            },
        });
        $.ajax({
            url: "/policy", method: 'GET', success: function (data) {
                console.log(data);
                $("#selected-policy-text").text(data.text);
            },
        });

        let successes = $("<ul class='list-group'></ul>");
        let warnings = $("<ul class='list-group'></ul>");
        let failures = $("<ul class='list-group'></ul>");

        $.ajax({
            url: "/gpt/analyze-policy/rating", method: 'GET', success: function (data) {
                console.log(data);
                let count_success = 0;
                let count_warning = 0;
                let count_failure = 0;
                data.forEach((goal) => {
                    switch (goal.rating) {
                        case 0:
                            count_failure++;
                            failures.append(`<li class="list-group-item">${goal.goal}</li>`);
                            break;
                        case 1:
                            count_warning++;
                            warnings.append(`<li class="list-group-item">${goal.goal}</li>`);
                            break;
                        case 2:
                            count_success++;
                            successes.append(`<li class="list-group-item">${goal.goal}</li>`);
                            break;
                    }
                });
                fillDashboardPlaceholders(count_failure, count_warning, count_success);
                populatePrivacyGoals(data)
            }
        });

        $(".quote-holder, .quote-holder .blockquote").on("click", function () {
            const quoteText = $(this).find("p").text();
            highlightText(quoteText);
        });

    }

});