$(document).ready(function () {
    console.log('results.js loaded');

    // Fetch and display the selected policy text
    $.ajax({
        url: "/policy",
        method: 'GET',
        success: function (data) {
            console.log(data);
            $("#selected-policy-text").text(data.text);
        },
    });

    // Fetch and display the GPT analysis results
    $.ajax({
        url: "/gpt/analyze-policy",
        method: 'GET',
        success: function (data) {
            console.log(data);
            $("#gpt-results-spinner").remove();
            data.forEach((goals, achievementLevel) => {
                let achievementLevelText;

                switch (achievementLevel) {
                    case 0:
                        achievementLevelText = "";
                        break;
                    case 1:
                        achievementLevelText = 'warning';
                        break;
                    case 2:
                        achievementLevelText = 'danger';
                }

                goals.forEach((goal, i) => {
                    const summaryList = $('<ul></ul>');
                    const summaries = goal.gpt_summary.replace(/^- /, '').split(/\n-\s+/).filter(summary => summary.trim() !== '');
                    const formattedSummaries = summaries.map(summary => {
                        return summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    });

                    formattedSummaries.forEach(summary => {
                        summaryList.append(`<li>${summary}</li>`);
                    });

                    const goalElement = $(`
                        <li data-id="${i}" class="goal-container list-group-item ${achievementLevelText !== '' ? 'list-group-item-' + achievementLevelText : ''}">
                            <div>
                                <span class="goal-achievement-level">${achievementLevel}</span>
                                <h4 class="goal-text">${goal.goal}</h4>
                                ${summaryList.prop('outerHTML')}
                            </div>
                        </li>
                    `);

                    $("#goal-list").append(goalElement);
                });
            });

            // Add click event listener to quote icons and quotes
            $(".quote-holder, .quote-holder .blockquote").on("click", function () {
                const quoteText = $(this).find("p").text();
                highlightText(quoteText);
            });
        }
    });

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