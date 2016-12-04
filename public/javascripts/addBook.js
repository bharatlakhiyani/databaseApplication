$(document).ready(function() {
  // alert($('#dataOfBooks').html());

  $.get( '/services/authors', function(data) {
    $( "#author" ).autocomplete({
      source: data
    });
  });

  $.get( '/services/publishers', function(data) {
    $( "#publisher" ).autocomplete({
      source: data
    });
  });

  $.get( '/services/branches', function(data) {
    $( "#branch" ).autocomplete({
      source: data
    });
  });


});
