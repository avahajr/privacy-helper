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

    let successes = $("<ul class='list-group'></ul>");
    let warnings = $("<ul class='list-group'></ul>");
    let failures = $("<ul class='list-group'></ul>");
    let dashboard = $();
    $.ajax({
        url:"/gpt/analyze-policy/rating",
        method: 'GET',
        success: function (data) {
            console.log(data);
            data.forEach((goal) => {
                switch (goal.rating) {
                    case 0:
                        failures.append(`<li class="list-group-item">${goal.goal}</li>`);
                        break;
                    case 1:
                        warnings.append(`<li class="list-group-item">${goal.goal}</li>`);
                        break;
                    case 2:
                        successes.append(`<li class="list-group-item">${goal.goal}</li>`);
                        break;
                }
    })

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