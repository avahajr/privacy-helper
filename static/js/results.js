$(document).ready(function () {
    console.log('results.js loaded');
    initPlaceholders();
    // Fetch and display the selected policy text
    $.ajax({
        url: "/policy",
        method: 'GET',
        success: function (data) {
            console.log(data);
            $("#selected-policy-text").text(data.text);
        },
    });

    let successes = $("<ul class='list-group'></ul>");
    let warnings = $("<ul class='list-group'></ul>");
    let failures = $("<ul class='list-group'></ul>");

    $.ajax({
        url: "/gpt/analyze-policy/rating",
        method: 'GET',
        success: function (data) {
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

            fillPlaceholders();

            $("#goals-completely-met").empty().append($(`<div class='bold h3'>${count_success}</div>`));
            $("#goals-partially-met").empty().append($(`<div class='bold h3'>${count_warning}</div>`));
            $("#goals-not-met").empty().append($(`<div class='bold h3'>${count_failure}</div>`));


            $("#percent-compliance span").text(`${Math.round((count_success / data.length) * 100)}`);
        },
    });


    function generateGoalList(goals, listElement) {
        goals.forEach((goal) => {
            listElement.append(`<li class="list-group-item">${goal}</li>`);
        });
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
            <span class="placeholder col-5"></span>
        </div>
    `);
    }

function fillPlaceholders() {
    const themes = ["not-met", "partially-met", "completely-met"];
    const icons = ["bi-x-circle-fill", "bi-exclamation-triangle-fill", "bi-check-circle-fill"];
    const texts = ["Goals not met", "Goals partially met", "Goals completely met"];

    themes.forEach((theme, index) => {
        $(`#goals-${theme}`).parent().find('i').removeClass('placeholder').addClass(icons[index]);
        $(`#goals-${theme}`).parent().find('.placeholder-glow').remove();
        $(`#goals-${theme}`).parent().append(`<div>${texts[index]}</div>`);
    });

    // Fill percent compliance placeholder
    $("#percent-compliance").html(`<span>0</span>% of your goals were completely met.`);
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
});