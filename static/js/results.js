$(document).ready(function () {
    const themes = ["not-met", "partially-met", "completely-met"];
    const icons = ["bi-x", "bi-exclamation-triangle", "bi-check-lg"];
    const texts = ["Goals not met", "Goals partially met", "Goals completely met"];
    const colors = ["danger", "warning", "success"];

    rerollUI(true);
    $("#reroll").click(function () {
        rerollUI()
    });

    function constructGoalCard(goal, goal_id) {
        const summary_paragraphs = goal.gpt_summary.split('\n');
        let sentenceCounter = 0
        return $(`
<div class="card mb-3 card-${colors[goal.rating]}">
    <div class="card-body">
        <div class="goal-header-row">
            <i class="bi h5 ${icons[goal.rating]} text-${colors[goal.rating]} pe-2"></i>
            <h5 class="goal-header">${goal.goal}</h5>
        </div>
        <div class="goal-summary" data-goal-id="${goal_id}">
        ${summary_paragraphs.map((paragraph) =>
            paragraph.trim() ? `<p>${paragraph
                .split(/(?<=[.!?])\s+/)
                .map((sentence) => sentence.trim() ? `<span data-s-id="${sentenceCounter++}">${sentence}</span>` : '')
                .join(' ')
            }</p>` : ""
        ).join('')}
        </div>
    </div>
</div>
`);
    }

    function initPlaceholders() {
        let summary_row = $("#summary-row");
        for (let i = 0; i < 3; i++) {
            summary_row.append(`
            <div class="col-4">
                <div class="card card-${themes[i]} w-100">
                    <div class="card-body">
                        <i class="bi placeholder w-25"></i>
                        <div id='goal-dashboard-${themes[i]}' class="h3">
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
        $("#compliance").html(`
        <div class="placeholder-glow">
            <span class="placeholder col-1"></span>
        </div>
        <div class="placeholder-glow">
            <span class="placeholder col-5"></span>
        </div>
    `);
    }

    function fillDashboardPlaceholders(count_failure, count_warning, count_success) {
        let icons = ["bi-x-circle-fill", "bi-exclamation-triangle-fill", "bi-check-circle-fill"];
        themes.forEach((theme, index) => {
            const goalDashboard = $(`#goal-dashboard-${theme}`)
            goalDashboard.parent().find('i').removeClass('placeholder').addClass(icons[index]);
            goalDashboard.parent().find('.placeholder-glow').remove();
            goalDashboard.parent().append(`<div>${texts[index]}</div>`);
        });

        const compliance = `${count_success} of ${count_failure + count_warning + count_success}`;
        const reaction = getReaction(count_success, count_warning, count_failure);

        $("#compliance").html(`<strong>${reaction}</strong> <div><span>${compliance}</span> of your goals were completely met.</div>`);

        $("#goal-dashboard-completely-met").empty().append($(`<div class='bold h3'>${count_success}</div>`));
        $("#goal-dashboard-partially-met").empty().append($(`<div class='bold h3'>${count_warning}</div>`));
        $("#goal-dashboard-not-met").empty().append($(`<div class='bold h3'>${count_failure}</div>`));

        $("#compliance span").text(`${compliance}`);
    }

    function getReaction(count_success, count_warning, count_failure) {
        const percent_compliance = Math.round((count_success / (count_success + count_warning + count_failure)) * 100);
        let reaction = "Ruh roh!"

        if (percent_compliance >= 50 && percent_compliance < 75) {
            reaction = "Not too shabby!"
        } else if (percent_compliance >= 75) {
            reaction = "Nice!"
        }
        return reaction
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
        goals.sort((a, b) => a.rating - b.rating);
        goals.forEach((goal, i) => {
            const goalItem = $(`
                <li data-id="${i}" class="list-group-item d-flex justify-content-between align-items-center">

                    <div class="d-flex align-items-center">
                        <i class="bi ${icons[goal['rating']]} text-${colors[goal['rating']]} pe-2"></i>
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

    function rerollUI(load_policy = false) {
        $("#summary-row").empty();
        initPlaceholders();

        if (load_policy) {
            $.ajax({
                url: "/policy", method: 'GET', success: function (data) {
                    console.log(data);
                    $("#selected-policy-text").text(data.text);
                },
            });
        }

        $.ajax({
            url: "/gpt/analyze-policy/rating",
            method: 'GET',
            success: function (data) {
                console.log(data);

                const goalCounts = {"not-met": 0, "partially-met": 0, "completely-met": 0};

                data.forEach((goal) => {
                    switch (goal.rating) {
                        case 0:
                            goalCounts["not-met"]++;
                            break;
                        case 1:
                            goalCounts["partially-met"]++;
                            break;
                        case 2:
                            goalCounts["completely-met"]++;
                            break;
                    }
                });

                fillDashboardPlaceholders(goalCounts["not-met"], goalCounts['partially-met'], goalCounts['completely-met']);
                populatePrivacyGoals(data);
                $.ajax({
                    url: "/goals", method: 'GET', success: function (data) {
                        console.log(data);
                        populatePrivacyGoals(data);
                    },
                });
                $.ajax({
                    url: "/gpt/analyze-policy/summary",
                    method: 'GET',
                    success: function (data) {
                        const resultsSpace = $("#results-space");
                        resultsSpace.empty();

                        const themes = ["not-met", "partially-met", "completely-met"];
                        const themeMap = {0: "not-met", 1: "partially-met", 2: "completely-met"};

                        themes.forEach((theme, index) => {
                            if (goalCounts[themeMap[index]] > 0) {
                                resultsSpace.append(`<div id="goals-${theme}">
                                                        <div class="h3 mb-3">${texts[index]}</div>
                                                     </div>`);
                            }
                        });

                        data.forEach((goal, i) => {
                            const goalBox = $(`#goals-${themeMap[goal.rating]}`);
                            if (goalBox.length) {
                                goalBox.append(constructGoalCard(goal, i));
                            }
                        });

                        addCitations();
                    }
                });
            }
        });

        $(".quote-holder, .quote-holder .blockquote").on("click", function () {
            const quoteText = $(this).find("p").text();
            highlightText(quoteText);
        });

    }

    function addCitations() {
        $.ajax({
            url: "/gpt/analyze-policy/quotes",
            method: 'GET',
            success: function (data) {
                let citation_num = 1;
                data.forEach((goal, goal_id) => {
                    goal.cited_summary.forEach((sentence, sentence_id) => {
                        addCitationByCoord(citation_num++, goal_id, sentence_id)
                    })
                });
            }
        });
    }

    function addCitationByCoord(citation_num, goal_id, sentence_id) {
        // Find the goal summary element by goal_id
        const goalSummary = $(`.goal-summary[data-goal-id="${goal_id}"]`);

        if (goalSummary.length) {
            let currentSentenceId = 0;

            // Iterate through all paragraphs within the goal summary
            goalSummary.find('p').each(function () {
                const paragraph = $(this);

                // Iterate through all sentences within the paragraph
                paragraph.find('span[data-s-id]').each(function () {
                    if (currentSentenceId === sentence_id) {
                        // Create a new span element with the citation number
                        const citationSpan = $(`<span class="citation">${citation_num}</span>`);

                        // Insert the citation span after the sentence span
                        $(this).after(citationSpan);
                        return false; // Exit the loop
                    }
                    currentSentenceId++;
                });

                if (currentSentenceId > sentence_id) {
                    return false; // Exit the loop
                }
            });
        }
    }
});