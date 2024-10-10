$(document).ready(function () {
    console.log('main.js loaded')
    $('.dropdown-item').on('click', function () {
        console.log($(this).text());
        $('#dropdown-menu-btn').text($(this).text());
    });
});