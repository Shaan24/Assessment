frappe.ui.form.on('Quotation', {
    refresh: function(frm) {
        frm.fields_dict.items.grid.update_docfield_property('rate', 'read_only', 1)
        frm.fields_dict.items.grid.update_docfield_property('item_name', 'read_only', 1)
    }
});