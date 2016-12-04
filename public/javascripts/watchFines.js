
$(document).ready(function() {
  // alert($('#dataOfBooks').html());
  var table = $('#fines').DataTable({
        data: JSON.parse($('#dataOfFines').html()),
        'bSort': true,
        "pageLength": 25,
        columns: [
          { data: 'bookid', title:'No'},
          // { data: 'bookid', title:'Book Id'},
          { data: 'title', title:'Book Title'},
          // { data: 'bluepayId', title:'Bluepay Id'},
          { data: 'isbn', title:'ISBN'},
          { data: 'authorname', title:'Author Name'},
          { data: 'borrowdate', title:'Borrow Date'},
          { data: 'expectedreturndate', title:'Expected Returndate', defaultContent:'N/A'},
          { data: 'daysleft', title:'Days Late', defaultContent:'N/A'},
          { data: 'fine', title:'Fine', defaultContent:'N/A'}
          // { data: null, title:'Check-out', defaultContent:'<i class="fa  fa-check-circle book-datatable-actions"></i>'},
        ],
        columnDefs: [
          { "width": "5%", "targets": 0 },
          { "width": "20%", "targets": 1 },
          { "width": "10%", "targets": 2, "className": "dt-center" },
          { "width": "15%", "targets": 3, "className": "dt-center" },
          { "width": "10%", "targets": 4, "className": "dt-center", "render": function (data) {
              var date = new Date(data);
              var month = date.getMonth() + 1;
              return (month.length > 1 ? month : 0 + month) + "/" + date.getDate() + "/" + date.getFullYear();
            }
          },
          { "width": "15%", "targets": 5, "className": "dt-center", "render": function (data) {
              var date = new Date(data);
              var month = date.getMonth() + 1;
              return (month.length > 1 ? month : 0 + month) + "/" + date.getDate() + "/" + date.getFullYear();
            }
          },
          { "width": "10%", "targets": 7, "className": "dt-center", render:function(data){
            return "$"+parseFloat(data).toFixed(2);
          }
         },
          // { "width": "10%", "targets": 8, "className": "dt-center" }
        ],

        "scrollY":        $(document).height()-270 +"px",
        // "scrollCollapse": true,
        "info":           true,
        "paging":         true,
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
        "aaSorting": [[ 6, 'desc' ]],
        "footerCallback": function ( row, data, start, end, display ) {
            var api = this.api(), data;

            // Remove the formatting to get integer data for summation
            var intVal = function ( i ) {
                return typeof i === 'string' ?
                    i.replace(/[\$,]/g, '')*1 :
                    typeof i === 'number' ?
                        i : 0;
            };

            // Total over all pages
            total = api
                .column( 7 )
                .data()
                .reduce( function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0 );

            $('#grandTotal').html("Grand Total : $ "+total.toFixed(2));

            // Total over this page
            pageTotal = api
                .column( 7, { page: 'current'} )
                .data()
                .reduce( function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0 );

            $('#pgTotal').html("Total(Page) : $ "+pageTotal.toFixed(2));

            // Update footer
            $( api.column( 7 ).footer() ).html(
                '$'+pageTotal +' ( $'+ total +' total)'
            );
        }
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
