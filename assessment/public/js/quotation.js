frappe.ui.form.on('Quotation', {
    refresh: function(frm) {
        frm.set_df_property('items', 'hidden', true);
        const link_field_options = {};
        let selectedRows = [];

        function normalize_items_idx() {
            if (frm.doc.items) {
                frm.doc.items.forEach((item, index) => {
                    item.idx = index + 1;
                });
                frm.refresh_field('items');
            }
        }

        function render_items_table() {
            if (!frm.doc) return;
            const items = frm.doc.items || [];
            normalize_items_idx();

            const fields = frappe.meta.get_docfields('Quotation Item', frm.doc.name);
            const visible_fields = fields.filter(field =>
                !['Section Break', 'Column Break', 'Tab Break', 'Fold'].includes(field.fieldtype)
            );

            let html = `
               <style>
                    .items-table-container {
                        max-width: 100%;
                        overflow-x: auto;
                        border: 1px solid #d1d8dd;
                        margin-bottom: 10px;
                    }
                    .items-table {
                        width: max-content;
                        border-collapse: collapse;
                        font-size: 12px;
                        table-layout: auto;
                    }
                    .items-table th, .items-table td {
                        border: 1px solid #d1d8dd;
                        padding: 6px 8px;
                        text-align: left;
                        vertical-align: middle;
                        white-space: nowrap;
                        background-color: white;
                    }
                    .items-table th {
                        background-color: #f7fafc;
                        font-weight: bold;
                        position: sticky;
                        top: 0;
                        z-index: 2;
                    }
                    .items-table tr:nth-child(even) {
                        background-color: #fafafa;
                    }
                    .items-table tr.selected {
                        background-color: #e6f3ff;
                    }
                    .items-table input, .items-table select, .items-table textarea {
                        width: 100%;
                        padding: 4px;
                        border: 1px solid #d1d8dd;
                        border-radius: 3px;
                        font-size: 12px;
                        box-sizing: border-box;
                    }
                    .items-table input[readonly], .items-table select[readonly] {
                        background-color: #f0f4f7;
                        cursor: not-allowed;
                    }
                    .items-table textarea {
                        resize: vertical;
                        min-height: 50px;
                    }
                    .add-row-btn {
                        margin-top: 8px;
                        padding: 6px 12px;
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                        background-color: #1b00ff;
                        color: #fff;
                        font-size: 12px;
                    }
                    .add-row-btn:hover {
                        background-color: #1400cc;
                    }
                    .delete-row-btn {
                        padding: 4px 8px;
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                        background-color: #ff5858;
                        color: #fff;
                        font-size: 12px;
                    }
                    .delete-row-btn:hover {
                        background-color: #e04c4c;
                    }
                    .row-checkbox {
                        margin: 0;
                    }

                    /* Freeze first two columns */
                    .items-table th.freeze-col,
                    .items-table td.freeze-col {
                        position: sticky;
                        left: 0;
                        z-index: 3;
                        background: #f7fafc;
                    }

                    .items-table th.freeze-col-2,
                    .items-table td.freeze-col-2 {
                        position: sticky;
                        left: 60px; /* Adjust this based on No. column width */
                        z-index: 3;
                        background: #f7fafc;
                    }
                </style>
                <div class="items-table-container">
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th class="freeze-col" style="width: 60px;">No.</th>
                                ${visible_fields.map(field =>
                                    field.fieldname === 'item_code'
                                        ? `<th class="freeze-col-2">${field.label || field.fieldname}</th>`
                                        : `<th>${field.label || field.fieldname}</th>`
                                ).join('')}
                                <th style="width: 10px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            items.forEach((item, row_idx) => {
                const isSelected = selectedRows.includes(row_idx);
                html += `
                    <tr data-row-idx="${row_idx}" class="${isSelected ? 'selected' : ''}">
                        <td class="freeze-col">
                            <input type="checkbox" class="row-checkbox" data-row-idx="${row_idx}" ${isSelected ? 'checked' : ''} onchange="frappe.quotation.toggle_row_selection(this, '${frm.doc.name}')">
                            ${item.idx}
                        </td>
                `;

                visible_fields.forEach(field => {
                    const value = item[field.fieldname] || '';
                    const is_readonly = ['rate', 'item_name'].includes(field.fieldname);
                    const freeze_class = field.fieldname === 'item_code' ? 'freeze-col-2' : '';
                    let formatted_value = '';

                    if (field.fieldtype === 'Link' && field.options) {
                        formatted_value = `
                            <select class="link-field custom-table-input ${freeze_class}" data-row-idx="${row_idx}" data-fieldname="${field.fieldname}" ${is_readonly ? 'readonly' : ''} onchange="frappe.quotation.update_field_value(this, '${frm.doc.name}')">
                                <option value="">Select...</option>
                                ${link_field_options[field.options]?.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('') || ''}
                            </select>
                        `;
                        if (!link_field_options[field.options]) {
                            fetch_link_options(field.options, options => {
                                link_field_options[field.options] = options;
                                const select = document.querySelector(`select[data-row-idx="${row_idx}"][data-fieldname="${field.fieldname}"]`);
                                if (select) {
                                    select.innerHTML = `<option value="">Select...</option>${options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('')}`;
                                }
                            });
                        }
                    } else {
                        let input_type = 'text';
                        if (['Int', 'Float', 'Currency', 'Percent'].includes(field.fieldtype)) {
                            input_type = 'number';
                        } else if (field.fieldtype === 'Date') {
                            input_type = 'date';
                        } else if (field.fieldtype === 'Check') {
                            input_type = 'checkbox';
                        }
                        if (['Text', 'Small Text', 'Long Text'].includes(field.fieldtype)) {
                            formatted_value = `
                                <textarea class="custom-table-input ${freeze_class}" data-row-idx="${row_idx}" data-fieldname="${field.fieldname}" ${is_readonly ? 'readonly' : ''} onchange="frappe.quotation.update_field_value(this, '${frm.doc.name}')">${value}</textarea>
                            `;
                        } else {
                            formatted_value = `
                                <input type="${input_type}" value="${value}" class="custom-table-input ${freeze_class}" data-row-idx="${row_idx}" data-fieldname="${field.fieldname}" ${is_readonly ? 'readonly' : ''} ${field.fieldtype === 'Check' && value ? 'checked' : ''} onchange="frappe.quotation.update_field_value(this, '${frm.doc.name}')"/>
                            `;
                        }
                    }
                    html += `<td class="${freeze_class}">${formatted_value}</td>`;
                });

                html += `
                        <td>
                            <button class="delete-row-btn" data-row-idx="${row_idx}" onclick="frappe.quotation.delete_row('${frm.doc.name}', ${row_idx})">Delete</button>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
                <button class="add-row-btn" onclick="frappe.quotation.add_new_row('${frm.doc.name}')">Add Row</button>
            `;
            frm.set_df_property('custom_items_html', 'options', html);
        }

        function fetch_link_options(doctype, callback) {
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: doctype,
                    fields: ['name'],
                    limit_page_length: 100
                },
                callback: function(r) {
                    const options = r.message.map(item => item.name);
                    callback(options);
                },
                error: function(err) {
                    console.error(`Failed to fetch options for ${doctype}:`, err);
                    callback([]);
                }
            });
        }

        const debounced_render = frappe.utils.debounce(render_items_table, 500);

        frappe.quotation = {
            update_field_value: function(element, docname) {
                if (frm.doc.name !== docname) return;
                if (!element.classList.contains('custom-table-input')) return;

                let row_idx = parseInt(element.dataset.rowIdx);
                if (isNaN(row_idx) || row_idx < 0 || row_idx >= frm.doc.items.length) return;

                const item = frm.doc.items[row_idx];
                if (!item) return;

                const fieldname = element.dataset.fieldname;
                const value = element.type === 'checkbox' ? (element.checked ? 1 : 0) : element.value;

                frappe.model.set_value('Quotation Item', item.name, fieldname, value);
                debounced_render();
            },
            add_new_row: function(docname) {
                if (frm.doc.name !== docname) return;
                frm.add_child('items');
                normalize_items_idx();
                frm.refresh_field('items');
                debounced_render();
            },
            delete_row: function(docname, row_idx) {
                if (frm.doc.name !== docname) return;
                const item = frm.doc.items[row_idx];
                if (item) {
                    const grid = frm.fields_dict.items.grid;
                    const grid_row = grid.grid_rows.find(row => row.docname === item.name);
                    if (grid_row) {
                        grid.remove(grid_row.idx);
                    } else {
                        frm.doc.items.splice(row_idx, 1);
                        frm.refresh_field('items');
                    }
                    selectedRows = selectedRows.filter(idx => idx !== row_idx);
                    debounced_render();
                    frm.dirty();
                }
            },
            toggle_row_selection: function(element, docname) {
                if (frm.doc.name !== docname) return;
                const row_idx = parseInt(element.dataset.rowIdx);
                if (isNaN(row_idx)) return;

                if (element.checked) {
                    if (!selectedRows.includes(row_idx)) selectedRows.push(row_idx);
                } else {
                    selectedRows = selectedRows.filter(idx => idx !== row_idx);
                }
                debounced_render();
            },
            get_selected_rows: function() {
                return selectedRows;
            }
        };

        render_items_table();
        frm.fields_dict.items.grid.on('data_changed', debounced_render);
    }
});
