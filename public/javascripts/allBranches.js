
$(document).ready(function() {
  // alert($('#dataOfBooks').html());
  var table = $('#branchTable').DataTable({
        data: JSON.parse($('#branchInformation').html()),
        'bSort': true,
        "pageLength": 15,
        columns: [
          { data: 'libid', title:'Branch Id'},
          { data: 'name', title:'Branch Name'},
          { data: 'location', title:'Branch Location'}
        ],
        columnDefs: [
          { "width": "10%", "targets": 0 },
          { "width": "40%", "targets": 1 },
          { "width": "50%", "targets": 2 },
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
        // "aoColumnDefs": [
        //     { "bSortable": false, "aTargets": [ 0 ] }
        // ],
        "aaSorting": [[ 2, 'asc' ]]
  });

  // $('.book-datatable-actions').click(function(){
  //   var child = $(this).parent().parent().children()[0];
  //   var rowId = child._DT_CellIndex.row;
  //   var data = JSON.parse($('#dataOfBooks').html());
  //   if(confirm("Press Ok to confirm reservation for following book. \n\nBook name:"+data[rowId].title+"\nBranch: "+data[rowId].branchname+"\nISBN: "+data[rowId].isbn))
  //   {
  //     $.ajax({
  //           url: "/checkoutBook",
  //           type: 'PUT',
  //           data: data[rowId],
  //           dataType: 'json',
  //           success: function(result) {
  //             if(result.error)
  //             {
  //               alert(result.error);
  //             } else if(result.success){
  //               alert(result.success);
  //               location.reload();
  //             } else {
  //               alert(JSON.stringify(result));
  //             }
  //           }
  //       });
  //   }
  //   // alert(JSON.stringify(data[rowId]))
  // });

});
