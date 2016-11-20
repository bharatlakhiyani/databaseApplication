
$(document).ready(function() {
  // alert($('#dataOfBooks').html());
  $('#allBooks').DataTable({
        data: JSON.parse($('#dataOfBooks').html()),
        'bSort': true,
        "pageLength": 15,
        columns: [
          { data: 'bookid', title:'No'},
          { data: 'bookid', title:'Book Id'},
          { data: 'title', title:'Book Title'},
          // { data: 'bluepayId', title:'Bluepay Id'},
          { data: 'isbn', title:'ISBN'},
          { data: 'authorname', title:'Author Name'},
          { data: 'publishername', title:'Publisher'},
          { data: 'branchname', title:'Branch', defaultContent:'N/A'},
          { data: 'noc', title:'Total Copies', defaultContent:'N/A'},
          { data: 'ac', title:'Available', defaultContent:'N/A'}
          // { data: null, title:'Action', defaultContent:'<i class="fa  fa-chevron-circle-down admin-datatable-actions"></i>'},
        ],
        columnDefs: [
          { "width": "5%", "targets": 0 },
          { "width": "5%", "targets": 1 },
          { "width": "20%", "targets": 2 },
          { "width": "10%", "targets": 3, "className": "dt-center" },
          { "width": "15%", "targets": 4, "className": "dt-center" },
          { "width": "10%", "targets": 5, "className": "dt-center" },
          { "width": "15%", "targets": 6, "className": "dt-center" },
          { "width": "10%", "targets": 7, "className": "dt-center" },
          { "width": "10%", "targets": 8, "className": "dt-center" }
        ],

        "scrollY":        $(document).height()-250 +"px",
        // "scrollCollapse": true,
        "info":           true,
        "paging":         false,
        rowReorder: {
            selector: 'td:nth-child(2)'
        },
        responsive: true,
        "fnDrawCallback": function ( oSettings ) {
            /* Need to redo the counters if filtered or sorted */
            if ( oSettings.bSorted || oSettings.bFiltered )
            {
                for ( var i=0, iLen=oSettings.aiDisplay.length ; i<iLen ; i++ )
                {
                    $('td:eq(0)', oSettings.aoData[ oSettings.aiDisplay[i] ].nTr ).html( i+1 );
                }
            }
        },
        "aoColumnDefs": [
            { "bSortable": false, "aTargets": [ 0 ] }
        ],
        "aaSorting": [[ 1, 'asc' ]]
  });
});
