$(document).ready(function () {
    $("#selected-policy").hide();
    console.log('main.js loaded')
    $('.dropdown-item').on('click', function () {
        let selectedPolicy = $(this).text();
        console.log(selectedPolicy);
        $('#dropdown-menu-btn').text(selectedPolicy);

        // Show the selected policy
        $("#selected-policy-filename").text(`${selectedPolicy}.txt`);
        $.ajax({
            url: `static/policies/${selectedPolicy}.txt`,
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