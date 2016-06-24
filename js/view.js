/**
 * @global FirebaseView
 * @name FirebaseView
 * @description FirebaseViews are the visual building blocks of an application. They allow for
 * efficient DOM manipulation, enhanced code readability, and a means of binding the structure of
 * ORM objects with their visual presentation and underlying functionality.
 */
function FirebaseView(type, data) {
	// Base values for generating the view
	data = Is.option(data);
	var view = this;

	/**
	 * @property	is
	 * @description Stores a key-value mapping for the internal data and state of the view
	 */
	view.is = {
		// View type
		a: type || 'view',

		// Internal flags
		displayed: 'block',		// Display style
		visible: true,			// Whether the view is visible
		focused: false,			// By default views are not in focus.

		// References to child views and hierarchy data.
		parentOf: {},			// Mapping between child id's and corresponding views.
		parenting: 0,			// The number of direct children.
		ordering: [],			// The order of the child id's
		childOf: null,			// Parent element.
		childId: null,			// The id used by this view's parent to refer to it.

		// Element class, attributes, and callback functions.
		marked: {},				// Classes that are applied to this element.
		markable: {},			// Adds classes based on view state.
		bem: null,				// Block element
		bm: {},					// Block modifiers
		attributed: {},			// Attributes that are applied to this element.
		handling: {},			// Event handlers
		handlingOnce: {},		// Event handlers
		handlingListener: {},	// Events that are attached to the element
		clickedAtTime: 0,
		doubleClicking: 400,

		// Callback functions to override default functionality
		generating: null,		// Function for generating child views with .add
		selecting: null,		// Function for selecting child views with .select
		selectingBy: null,		// Function applied to a selected view
		unselectingBy: null,	// Function applied to a deselected view
		settingValue: null,		// Function for updating view with .val
		gettingValue: null,		// Function for updating view with .val
		removing: null			// Function for removing view with .remove
	};

	/**
	 * @property 	element
	 * @description Performs the initialization for the view's underlying DOM element.
	 * 				This can be done by either passing no element, in which case a new
	 * 				element will be created with the specified tag or default to a div.
	 * 				A string can also be passed in as the element, which will attempt to
	 * 				retrieve an existing element with the given id.
	 */
	if (Is.str(data.element)) {
		view.element = document.getElementById(data.element);
		view.is.visible = (view.element.style.display !== 'none');
	}
	else if (Is.undef(data.element))
		view.element = document.createElement(data.tag || 'div');
	else
		view.element = data.element;

	/**
	 * @property	$
	 * @description jQuery binding to implement sortable, draggable, and other jQuery UI functions
	 */
	if (view.element.nodeType === 1) {
		view.$ = $(view.element).data('view', view);
	}

	// Refreshes the elements class name using the list of markings assigned
	// to this view.
	var refreshMarking = function() {
		var result = '';
		Each.pair(view.is.marked, function(mark, isMarked) {
			if (isMarked) result += mark + ' ';
		});
		// Remove the trailing space
		result = result.substring(0, result.length - 1);

		// Only reload the class if it is different from the current one
		view.element.className = result;
		view.is.ofClass = result;
	};

	// Sanitizes the input string into a class name, by removing spaces and non-alphanumeric
	// characters, and replacing them with dashes.
	var toMarking = function(mark) {
		return mark.replace(/[^a-zA-Z0-9\-\_]/g, '-').toLowerCase();
	};

	/**
	 * @property	can
	 * @description Key mapping of external functions exported by this view or a superview.
	 */
	view.can = {};


	/**
	 * Returns the string type or sets the type of this view.
	 * @param  {str} [t] - Type for view to be set to.
	 * @return {(str|FirebaseView)} - Returns type of view or view itself.
	 */
	view.type = function(t) {
		if (Is.str(t)) {
			view.is.a = toMarking(t);
			return view;
		}
		else return view.is.a;
	}

	/**
	 * @function 	view.getType() -> type:str
	 * @description	Returns the type of this view.
	 */
	view.getType = function() {
		return view.is.a;
	};

	/**
	 * @function 	view.getId() -> id:str
	 * @description Returns the child id of this view.
	 */
	view.getId = function() {
		return view.is.childId;
	};



	/**
	 * Adds a view with the given id, which is used to reference it in the parent->child relationship.
	 * @function 	view.add(id:str, newView:view) -> this:view
	 * @param {str} [id] - id to be given to child view once added
	 * @param {FirebaseView} newView - View to be added to parent view
	 * @param {str} [before] - id of view which newView should be added before
	 *
	 */

	view.add = function(id, newView, before) {
		var beforeElement;
		// Auto-assign an id if one is not given
		if (Is.def(id) && Is.undef(newView)) {
			newView = id;
			id = view.is.parenting;
		}
		// If this is a valid element that can be linked.
		if (Is.view(newView) && view != newView) {
			// Before refers to element successor or null
			if (Is.def(before)) {
				if (Is.view(before) && before.is.childOf == view)
					beforeElement = before.element;
				else if (Is.str(before) || Is.num(before))
					beforeElement = (view.hasChild(before)) ? view.child(before).element : null;
				else
					beforeElement = null;
			}

			// Remove the view if it is already a child
			if (newView.hasParent())
				newView.remove();

			// Replace an existing view if it is already
			// been added with this id.
			if (view.is.parentOf[id]) {
				if (Is.def(before)) {
					view.is.ordering.splice(view.is.ordering.indexOf(id), 1);
					view.is.ordering.splice(
						view.is.ordering.indexOf(before), 0, id);
					view.element.insertBefore(newView.element, beforeElement);
				}
				else {
					newView.show(view.is.parentOf[id].is.visible);
				 	view.element.replaceChild(newView.element, view.is.parentOf[id].element);
				}
				 view.is.parentOf[id] = newView;
			}
			else {
				// Create a parent->child reference between the views.
				view.is.parentOf[id] = newView;
				view.is.parenting++;

				// Insert the child element into this one
				if (Is.def(before)) {
					view.is.ordering.splice(
						view.is.ordering.indexOf(before), 0, id);
					view.element.insertBefore(newView.element, beforeElement);
				}
				// Normally just appendChild the element
				else {
					view.is.ordering.push(id);
					view.element.appendChild(newView.element);
				}
			}

			newView.is.childId = id;
			newView.is.childOf = view;
			newView.on('birth', view);

			view.on('add', newView);
			view.on('change');
		}
		// If this is a key-value mapping of elements to add or an array of data/elements.
		else if (Is.enum(newView)) {
			if ( Is.func(view.is.generating) ) {
				newView = view.is.generating(id, newView);
				if (Is.view(newView))
					view.add(id, newView, before);
			}
			else Each.pair(newView, view.add);
		}
		// Define a function for generating new views
		else if (Is.func(newView))
			view.is.generating = newView;

		// If this is a primitive value to add as a text node
		else if (Is.def(newView)) {
			view.add(id, new FirebaseView('text', {
				element: document.createTextNode('' + newView)
			}), before);
			return view;
		}
		return view;
	};

	/**
	 * Adds a view as the first child of the parent view
	 * @function view.addFirst(view)
	 * @param {FirebaseView} newView - View to be added to parent view.
	 * @param {str} [id] - Id to be given to added child view.
	 */
	view.addFirst = function(id, newView) {
		return view.add(id, newView, view.is.ordering[0]);
	};

	/**
	 * Adds a given view after the view with a given child id, with an optional id.
	 * @function view.addAfter(child, id, view)
	 * @param {str} child - id of child view which view should be added after.
	 * @param {str} [id] - id to be given to added child view.
	 * @param {FirebaseView} newView - View to be added to parent view.
	 */
	view.addAfter = function(child, id, newView) {
		if (Is.view(child) && child.is.childOf == view) {
			return view.add(id, newView, view.is.ordering[view.is.ordering.indexOf(child.getId()) + 1]);
		}
		if (Is.def(child) && view.hasChild(child)) {
			return view.add(id, newView, view.is.ordering[view.is.ordering.indexOf(child) + 1]);
		}
		else return view.add(id, newView);
	};

	/**
	 * Adds a given view before the view with a given child id, with an optional id.
	 * @function view.addAfter(child, id, view)
	 * @param {str} child - id of child view which view should be added before.
	 * @param {str} [id] - id to be given to added child view.
	 * @param {FirebaseView} newView - View to be added to parent view.
	 */
	view.addBefore = function(child, id, newView) {
		return view.add(id, newView, child);
	};

	/**
	 * @deprecated
	 * @function	view.replace(id, child)
	 *	  - Deprecated, uses the add function to replace the child view for the given id.
	 */
	view.replace = function(id, child) {
		if (view.hasChild(id)) {
			var index = view.is.ordering.indexOf(id);
			var before = (index + 1 < view.is.ordering.length) ? view.is.ordering[index + 1] : null;
			view.remove(id);
			view.add(id, child, before);
			return view;
		}
		else return view;
	};

	/*
	 **** addHidden(view)
	 *    - Adds a new view as a child to this one, and sets its visibility to hidden. Gives it a default
	 *		numeric id that auto increments starting from 0 whenever a new view is added.
	 *
	 **** addHidden(id, view)
	 *	  - Adds a hidden view with the given id, useful for addressing it later with the "child" function.
	 */

	/**
	 * Adds a new view as a child to this one, and sets its visibility to hidden.
	 *
	 * @param {str} [id] - id of child view that should be hidden.
	 * @param {FirebaseView} newView - id to be given to added child view.
	 * @param {str} [before] - id of view which newView should be added before
	 */
	view.addHidden = function(id, newView, before) {
		if (Is.def(id) && Is.undef(newView)) {
			newView = id;
			id = view.is.parenting;
		}
		if (Is.view(newView)) {
			newView.hide();
			view.add(id, newView, before);
		}
		else if (Is.obj(newView)) {
			if (Is.func(view.is.generating)) {
				view.add(id, newView);
				view.child(id).hide();
			}
			else {
				for (i in newView) {
					view.addHidden(i, newView);
				}
			}
		}
		else if (Is.array(newView)) {
			Each.value(newView, function(nv) {
				view.addHidden(nv);
			});
		}
		return view;
	};

	/**
	 * Moves a given child view/id before another given child view/id.
	 * @param  {(FirebaseView|str)} child - Child view/id to be moved.
	 * @param  {(FirebaseView|str)} before - Child view/id which target is moved before.
	 */
	view.move = function(child, before) {
		if (Is.view(child))
			child = child.getId();
		if (Is.view(before))
			before = before.getId();

		if (view.hasChild(child) && view.hasChild(before)) {
			view.element.insertBefore(view.child(child).element, view.child(before).element);

			if (view.is.ordering.indexOf(child) + 1 != view.is.ordering.indexOf(before)) {
				view.is.ordering.splice(view.is.ordering.indexOf(child), 1);
				view.is.ordering.splice(
					view.is.ordering.indexOf(before), 0, child);
			}
		}

	};

	/**
	 * Activate jQuery UI sortable on this view.
	 */

	/**
	 * Activate jQuery UI sortable on this view.
	 * @param  {function} sort - Callback for when view is sorted.
	 * @return {FirebaseView} - Returns newly sorted view.
	 */
	view.sortable = function(sort) {
		sort = Is.option(sort, { func: 'change' });
		var sortOptions = {};

		if (sort.helper)
			sortOptions.helper = function(ev, elem) {
				var drag = $(elem).data('view'),
					helper;

				if (Is.func(sort.helper))
					helper = sort.helper(drag.val());
				else
					helper = drag.copy();

				return (Is.view(helper)) ? helper.$ : null;
			};

		if (Is.str(sort.placeholder))
			sortOptions.placeholder = sort.placeholder + '-view';
		if (Is.num(sort.revert))
			sortOptions.revert = sort.revert;

		if (sort.connect)
			sortOptions.connectWith = '.' +
				((Is.str(sort.connect)) ? sort.connect : view.is.a) + '-view';

		if (Is.str(sort.disableMark))
			sortOptions.items = 'div:not(.' + toMarking(sort.disableMark) + ')';


		if (Is.def(sort.scroll))
			sortOptions.scroll = sort.scroll;

		if (sort.axis)
			sortOptions.axis = sort.axis;

		if (sort.delay)
			sortOptions.delay = sort.delay;

		sortOptions.start = function() {
			view.mark('sorting');
			if (Is.func(sort.start))
				sort.start(view);
		};

		sortOptions.stop = function() {
			view.unmark('sorting');
			if (Is.func(sort.stop))
				sort.stop(view);
		};

		sortOptions.update = function(ev, ui) {
			var oldOrder = view.is.ordering;
			view.is.ordering = [];
			ui.item.parent().children().each(function(_, sortChild) {
				view.is.ordering.push($(sortChild).data('view').getId());
			});
			if (Is.func(sort.change))
				// Provides a cancel function to stop the sorting
				sort.change(view, function() {
					view.is.ordering = oldOrder;
					view.$.sortable('cancel');

					// Cancel other sortable events.
					$(view.is.a + '-view').each(function() {
						var e = $(this);
						if (e.hasClass('sorting')) {
							e.sortable('cancel');
							setTimeout(function() {
								e.sortable('cancel');
							}, 100);
						}
					});
				});
		};
		if (view.$.sortable)
			view.$.sortable(sortOptions);

		return view;
	};


	/**
	 * Activates jQuery UI droppable on this view.
	 * @param  {object} drop - Object with properties for jQuery UI drop.
	 * @param {function} drop.drop - Callback function upon drop.
	 * @return {FirebaseView} - Returns this FirebaseView.
	 */
	view.droppable = function(drop) {
		drop = Is.option(drop);

		if (view.$.droppable)
			view.$.droppable(drop);

		return view;
	}

	/*
	 **** remove(id)
	 *    - Removes the view with the given id.
	 */

	/**
	 * Removes the view with the given id.
	 * @param  {str} id - Id of view to be removed.
	 * @return {FirebaseView} - Returns this FirebaseView.
	 */
	view.remove = function(id) {
		if (Is.func(id)) {
			view.is.removingChild = id;
		}
		// Remove from the parent view
		else if (Is.undef(id)) {
			if (view.hasParent())
				view.parent().remove(view.is.childId);
			else view.broadcast('death');
		}
		// Remove a specific child by id
		else if (Is.def(id)) {

			// Resolve id's by generator functions
			if (Is.func(view.is.removingChild)) {
				var newId = view.is.removingChild(id);
				if (Is.view(newId)) newId.remove();
				else if (Is.def(newId) && view.is.parentOf[newId]) id = newId;
				else return view;
			}

			if (! view.is.parentOf[id]) return view;

			// Ensure is parent in DOM before attempting removal
			if (view.is.parentOf[id].element.parentNode == view.element)
				view.element.removeChild(view.is.parentOf[id].element);

			// Remove references and delete relationship
			view.is.parentOf[id].broadcast('death', view);
			view.on('remove', view.is.parentOf[id]);
			view.is.ordering.splice(view.is.ordering.indexOf(id), 1);
			delete view.is.parentOf[id].childOf;
			delete view.is.parentOf[id];
			view.is.parenting--;

			// Events
			view.on('change');
		}
		return view;
	};

	/*
	 **** empty()
	 *    - Removes all subviews of this view.
	 */

	/**
	 * Removes all subviews of this view.
	 * @return {FirebaseView} - Returns this FirebaseView
	 */
	view.empty = function() {
		Each.key(view.is.parentOf, function(id) {
			view.remove(id);
		});
		return view;
	};

	/*
	 **** isEmpty()
	 *	  - Returns whether the view is empty (has no children).
	 */

	/**
	 * Returns whether the view is empty (has no children).
	 * @return {Boolean} - Returns boolean describing emptiness of FirebaseView.
	 */
	 view.isEmpty = function() {
	 	return view.is.parenting == 0;
	};

	/*
	 **** val()
	 *    - Returns the data value of the view. This function relies on view.can.setValue,
	 *		and view.can.getValue, so both must be manually set in order for this function to work
	 *		as expected.
	 */

	/**
	 * Returns the data value of the view. This function relies on view.can.setValue,
	 *		and view.can.getValue, so both must be manually set in order for this function to work
	 *		as expected.
	 * @param  {function} set - Function for setting the value of this FirebaseView
	 * @param  {function} get - Function for getting the value of this FirebaseView
	 * @return {FirebaseView} - Returns this FirebaseView.
	 */
	view.val = function(set, get) {
		if (Is.func(set)) {
			view.is.settingValue = set;
			if (Is.func(get))
				view.is.gettingValue = get;
		}
		else if (Is.def(set)) {
			if (Is.func(view.is.settingValue)) {
				// Fire the change event if the set-value function returns a true-equivalent value
				view.on('change', view.is.settingValue(set, view));
			}
		}
		// If no value was passed, check for a getValue function and use it to get the
		// current value of this view.
		else if (Is.func(view.is.gettingValue)) {
			return view.is.gettingValue(view);
		}
		return view;
	};

	/*
	 **** click(handler)
	 *    - Convenience method for assigning a click handler or executing the click event.
	 */
	/**
	 * Convenience method for assigning a click handler or executing the click event.
	 * @param  {function} [f] - Callback function for handling click events.
	 * @return {FirebaseView} - Returns this FirebaseView
	 */
	view.click = function(f) {
		if (Is.str(f)) {
			view.on('click', function() {
				view.on(f);
			});
		}
		else if (Is.func(f)) {
			view.on('click', f);
		}
		else if (Is.undef(f)) {
			view.on('click');
		}
		return view;
	};

	/*
	 **** click(handler)
	 *    - Convenience method for assigning hover handlers.
	 */

	/**
	 * Convenience method for assigning hover handlers.
	 * @param  {function} hoverIn  - callback function for handling hover in events.
	 * @param  {function} hoverOut - callback function for handling hover out events.
	 * @return {FirebaseView} - Returns FirebaseView.
	 */
	view.hover = function(hoverIn, hoverOut) {
		if (Is.str(hoverIn)) {
			view.on('mouseover', function() { view.mark(hoverIn); });
			view.on('mouseout', function() { view.unmark(hoverIn); });
			return view;
		}
		if (Is.func(hoverIn))
			view.on('mouseover', hoverIn);
		if (Is.func(hoverOut))
			view.on('mouseout', hoverOut);
		return view;
	};

	/*
	 **** focus()
	 *    - Shortcut for view.can.focus and for the focus event.
	 */

	/**
	 * Shortcut for view.can.focus and for the focus event.
	 * @param  {(function|str)} [f] - callback for handling focus events.
	 * @return {FirebaseView}  - returns FirebaseView.
	 */
	view.focus = function(f) {
		if (Is.func(f)) {
			view.on('focus', f);
		}
		else if (Is.str(f)) {
			if (f == 'show' || f == 'hide') {
				view.on('focus', function(self) {
					self[f]();
				});
			}
			else view.on('focus', f);
		}
		else {
			view.on('focus');
			if (Is.func(view.can.focus)) {
				view.can.focus(view);
			}
			view.is.focused = true;
		}
		return view;
	};

	/*
	 **** blur()
	 *    - Shortcut for view.can.blur and for the blur event.
	 */

	/**
	 * Shortcut for view.can.blur and for the blur event.
	 * @param  {(function|str)} [f] - Callback function for handling blur events.
	 * @return {FirebaseView}   - Returns FirebaseView.
	 */
	view.blur = function(f) {
		if (Is.func(f)) {
			view.on('blur', f);
		}
		else if (Is.str(f)) {
			if (f == 'show' || f == 'hide') {
				view.on('blur', function(self) {
					self[f]();
				});
			}
		}
		else {
			view.on('blur');
			if (Is.func(view.can.blur)) {
				view.can.blur(view);
			}
			view.is.focused = false;
		}
		return view;
	};

	/*
	 **** parent()
	 *    - Returns the parent view of this view.
	 */

	/**
	 * Returns the parent view of this view.
	 * @param  {str} [parentType] - Parent type to be found in DOM.
	 * @return {FirebaseView} - Returns parent view with given id or direct parent.
	 */
	view.parent = function(parentType) {
		if (Is.str(parentType)) {
			parentType = toMarking(parentType);
			var p = view.is.childOf;
			while (p && p.is.a != parentType) {
				p = p.is.childOf;
			}
			if (! p)
				return new FirebaseView();
			return p;
		}
		else if (view.is.childOf) {
			return view.is.childOf;
		}
		else return new FirebaseView();
	};

	/*
	 **** hasParent()
	 *    - Returns whether or not this view has a parent.
	 */

	/**
	 * Returns whether or not this view has a parent.
	 * @return {Boolean} - Returns whether or not this view has a parent.
	 */
	view.hasParent = function() {
	 	return Is.def(view.is.childOf);
	};

	/*
	 **** child()`
	 *	  - Returns a id-view mapping of all children of this view.
	 *
	 **** child(id)
	 *    - Returns the child subview of this view for the corresponding id.
	 */

	/**
	 * [child description]
	 * @param  {(str|num)} id - id of child view to be found.
	 * @return {[type]} - Returns child subview with given id or an id-view mapping of all children of this view.
	 */
	view.child = function(id) {
		// For string id's, look up a path
		if (Is.str(id)) {
			if (Is.func(view.is.selectingChild)) {
				var newId = view.is.selectingChild(id);
				if (Is.def(newId)) id = newId;
			}
			if (id.indexOf('/') < 0) {
				if (view.is.parentOf[id])
					return view.is.parentOf[id];
				else return new FirebaseView();
			}
			else {
				var path = id.split('/'), current = view;
				for (var i = 0 ; i < path.length ; i++) {
					current = current.child(path[i]);
				}
				return current;
			}
		}
		else if (Is.num(id) && view.is.parentOf[id])
			return view.is.parentOf[id];
		else return new FirebaseView();
	};

	/**** sibling(id)
	 *	  - Returns the sibling view with the given id.
	 */

	/**
	 * Returns the sibling view with the given id.
	 * @param  {str} id - id of sibling view.
	 * @return {FirebaseView} - Returns sibling FirebaseView
	 */
	view.sibling = function(id) {
		if (view.hasParent())
			return view.parent().child(id);
		else return new FirebaseView();
	};

	/**
	 * Returns previous sibling of current view.
	 * @return {FirebaseView} Returns previous sibling of current view.
	 */
	view.previous = function() {
		if (view.hasParent()) {
			var index = view.parent().is.ordering.indexOf(view.getId());
			if (index > 0)
				return view.parent().child(view.parent().is.ordering[index - 1]);
		}
		return new FirebaseView();
	};

	/**
	 * Returns next sibling of current view.
	 * @return {FirebaseView} - Returns next sibling of current view.
	 */
	view.next = function() {
		if (view.hasParent()) {
			var index = view.parent().is.ordering.indexOf(view.getId());
			if (index + 1 < view.parent().is.ordering.length)
				return view.parent().child(view.parent().is.ordering[index + 1]);
		}
		return new FirebaseView();
	};

	/**
	 * Returns last child view of this view.
	 * @return {FirebaseView} - Returns last child of this view.
	 */
	view.last = function() {
		if (view.is.ordering > 0) {
			return view.child(view.is.ordering[view.is.ordering.length - 1]);
		}
		return new FirebaseView();
	};

	/**
	 * Returns whether this view has a following sibling view.
	 * @return {Boolean} - Returns whether this view has a following sibling view.
	 */
	view.hasNext = function() {
		if (view.hasParent())
			return view.parent().is.ordering.indexOf(view.getId()) + 1 < view.parent().is.ordering.length;
		else return false;
	};

	/**
	 * Sorts the children of this view by the given ordering function.
	 * @param {(function|str)} [order] - Function that defines how view should be ordered.
	 */
	view.sort = function(order) {
		var elements = [], i;

		view.each(function(id, child) {
			elements.push({ 'id': id, 'child': child });
		});

		if (Is.undef(order)) {
			order = 'child';
		}
		if (Is.func(order)) {
			elements.sort(order);
		}
		else if (Is.str(order)) {
			if (order == 'key') {
				elements.sort(function(a, b) {
					return a.id == b.id ? 0 : (a.id > b.id ? 1 : -1);
				});
			}
			else if (order == 'child') {
				elements.sort(function(a, b) {
					var aValue = (Is.def(a.child.can.order) ? a.child.can.order : a.id);
					var bValue = (Is.def(b.child.can.order) ? b.child.can.order : b.id);
					return aValue == bValue ? 0 : (aValue > bValue ? 1 : -1);
				});
			}
		}

		//view.empty();
		for (i = 0; i < elements.length - 1; i++) {
			view.move(elements[i].id, elements[i + 1].id);
		}
	};

	/*
	 **** hasChild(id)
	 *    - Returns whether this view has a child with the given id.
	 */

	/**
	 * Returns whether this view has a child with the given id.
	 * @param  {str} id - id of child view.
	 * @return {Boolean} - Returns whether this view has a child with the given id.
	 */
	view.hasChild = function(id) {
		return view.is.parentOf[id] != null;
	};

	/**
	 * @function view.hasSibling(id)
	 * @description		Returns true if the view has a sibling with the given id
	 */
	/**
	 * Returns true if the view has a sibling with the given id
	 * @param  {[type]}  id - id of sibling view.
	 * @return {Boolean} - Returns true if the view has a sibling with the given id
	 */
	view.hasSibling = function(id) {
		if (view.is.childOf)
			return view.is.childOf.is.parentOf[id] != null;
		else return false;
	}

	/*
	 **** children()
	 *	  - Returns the mapping between ids and subviews.
	 */

	/**
	 * Returns the mapping between ids and subviews.
	 * @return {Object} - Returns the mapping between ids and subviews.
	 */
	 view.children = function() {
	 	return view.is.parentOf;
	 };

	 /**
	  * Returns the number of children of this view.
	  */
	view.childCount = function() {
		return view.is.parenting;
	};

	/*
	 **** copy()
	 *    - Returns an identical copy of this element.
	 */

	/**
	 * Returns an identical copy of this element.
	 * @return {FirebaseView} - Returns an identical copy of this element.
	 */
	view.copy = function() {
		var copy = new FirebaseView(type, {
			tag: view.is.tagged,
			element: view.element.cloneNode()
		});

		// Copy visibility and display settings.
		copy.is.displayed = view.is.displayed;
		copy.is.visible = view.is.visible;
		if (! copy.is.visible) { copy.hide(); }

		// Copy markings.
		Each.pair(view.is.marked, function(marking, isMarked) {
			if (isMarked) copy.mark(marking);
		});
		Each.pair(view.is.attributed, function(attribute, value) {
			copy.attribute(attribute, value);
		});

		// Recursively copy children
		// Each.pair(view.is.parentOf, function(childId, child) {
		// 	copy.add(childId, child.copy());
		// });
		//copy.is.parenting = view.is.parenting;

		return copy;
	};

	/*
	 **** show()
	 *    - Makes this view visible.
	 */

	/**
	 * Makes this view visible
	 * @param  {(boolean|str)} arg - If this is a boolean then it sets whether the view is showing or hiding,
	 * if it's a string, then it defines the id of the child to be shown.
	 * @return {FirebaseView} - Returns FirebaseView.
	 */
	view.show = function(arg) {
		// Boolean input shows/hides based on value
		if (Is.bool(arg))
			view[(arg) ? 'show' : 'hide']();
		// Show a given child
		else if (Is.str(arg) && view.hasChild(arg))
			view.child(arg).show();
		// Otherwise default action is to show
		else if (Is.undef(arg) && view.element.style) {
			view.element.style.display = (view.is.displayed) ? view.is.displayed : 'block';
			view.is.visible = true;
		}
		return view;
	};

	/**
	 * Makes this view hidden
	 * @param  {(boolean|str)} arg - If this is a boolean then it sets whether the view is hiding or showing,
	 * if it's a string, then it defines the id of the child to be hidden.
	 * @return {FirebaseView} - Returns FirebaseView.
	 */
	view.hide = function(child) {
		if (Is.str(child) || Is.num(child)) {
			view.child(child).hide();
		}
		else if (view.element.style.display != 'none') {
			view.element.style.display = 'none';
			view.is.visible = false;
		}
		return view;
	};

	/**
	 * Toggles whether view is hidden or showing
	 */
	view.toggle = function() {
		view.element.style.display = (view.is.visible) ? 'none' : ((view.is.displayed) ? view.is.displayed : 'block');
		view.is.visible = ! view.is.visible;
	};


	/**
	 * Convenience method for assigning a select/unselect handler or executing the select event.
	 * @param  {function} [select] - Callback function for handling select events.
	 * @param {function} [unselect] - Callback function for handling unselect events.
	 * @return {FirebaseView} - Returns this FirebaseView.
	 */
	view.select = function(select, unselect) {
		// For returning the currently selected view.
		if (Is.undef(select) && Is.undef(unselect)) {
			return view.is.selecting;
		}
		// For selecting a different child.
		else if (Is.def(select) && ! Is.func(select)) {
			// Either run the custom callback function, or hide the selected view if there is one
			if (Is.def(view.is.selecting)) {
				if (Is.func(view.is.unselectingBy))
					view.is.unselectingBy(view.is.selecting);
				else if (Is.view(view.is.selecting))
					view.is.selecting.on('unselect');
			}

			if (Is.def(view.is.selectingBy)) {
				view.is.selecting = view.is.selectingBy(select);

				// By default select the view.
				if (Is.view(view.is.selecting))
					view.is.selecting.on('select');
				// By default, store the select value
				else if (Is.undef(view.is.selecting))
					view.is.selecting = (view.hasChild(select)) ? view.child(select) : select;
			}
			// If the view has the select key as a child
			else if (view.hasChild(select))
				view.is.selecting = view.child(select).on('select');
			// By default, store the value
			else view.is.selecting = select;
		}
		// For attaching a selection/unselection function.
		else {
			// Attach selection function
			if (Is.func(select))
				view.is.selectingBy = select;
			// Attach deselection function
			if (Is.func(unselect))
				view.is.unselectingBy = unselect;
		}
		return view;
	};

	/*
	 **** mark(marking)
	 *	  - Adds the given marking or list of markings to the class name of this element.
	 */

	/**
	 * Adds the given marking or list of markings to the class name of this element.
	 * @param  {(str|str[])} marking - Marking or list of markings to be added.
	 * @return {FirebaseView} - Returns FirebaseView.
	 */
	view.mark = function(marking) {
		// For adding lists of markings.
		if (Is.array(marking)) {
			Each.value(marking, function(m) {
				view.mark(m);
			});
		}
		// Markings must be strings.
		else if (Is.str(marking)) {
			marking = toMarking(marking);
			view.is.marked[marking] = true;
			refreshMarking();
		}
		return view;
	};

	/**
	 * BEM utilities.
	 */

	/**
	 * NEEDS DOCUMENTATION
	 * @param  {[type]} b [description]
	 * @param  {[type]} m [description]
	 * @param  {[type]} c [description]
	 * @return {[type]}   [description]
	 */
	view.bm = function(b, m, c) {
		if (Is.undef(m) && view.is.bm[b])
			return view.is.bm[b];
		else if (Is.def(m))
			view.is.bm[b] = m;
		return view.bem(b, null, m, c);
	};

	/**
	 * NEEDS DOCUMENTATION
	 * @param  {[type]} e [description]
	 * @param  {[type]} m [description]
	 * @return {[type]}   [description]
	 */
	view.be = function(e, m) {
		if (view.is.childOf)
			view.bem(view.is.childOf.is.bem || view.is.childOf.is.a, e, m);
		else view.once('birth', function() {
			view.be(e, m);
		});
		return view;
	};

	/**
	 * NEEDS DOCUMENTATION
	 * @param  {[type]} b       [description]
	 * @param  {[type]} e       [description]
	 * @param  {[type]} m       [description]
	 * @param  {[type]} c       [description]
	 * @param  {[type]} marking [description]
	 * @return {[type]}         [description]
	 */
	view.bem = function(b, e, m, c, marking) {
		marking = b;
		if (b) view.is.bem = b;
		if (e) marking += '__' + e;
		if (m) marking += '--' + m;
		view[(c !== false) ? 'mark' : 'unmark'](marking);

		return view;
	};

	/*
	 **** unmark()
	 *    - Removes all markings from this view.
	 *
	 **** unmark(marking)
	 *	  - Removes the given marking or list of markings from the class name of this element.
	 */

	/**
	 * Removes all markings or a given marking/list of markings from this view.
	 * @param  {(str|str[])} [marking] - Marking or list of markings to be removed from the class name of this view.
	 * @return {FirebaseView} - Returns FirebaseView
	 */
	view.unmark = function(marking) {
		// For lists of markings.
		if (Is.array(marking)) {
			Each.value(marking, function(m) {
				view.unmark(m);
			});
		}
		// Markings must be strings.
		else if (Is.str(marking)) {
			marking = toMarking(marking);
			if (view.is.marked[marking]) {
				view.is.marked[marking] = false;
				refreshMarking();
			}
			else view.is.marked[marking] = false;
		}
		// If there is no input, unmarks all markings.
		else if (Is.undef(marking)) {
			Each.key(view.is.marked, function(mark) {
				view.unmark(mark);
			});
		}
		return view;
	};

	/*
	 **** isMarked(marking)
	 *	  - Returns whether this view has the given marking or any of the markings in the list.
	 */

	/**
	 * Returns whether this view has the given marking or any of the markings in the list.
	 * @param  {(str|str[])} marking - Marking or list of markings to be tested within this element.
	 * @return {Boolean} - Returns whether this view has the given marking or any of the markings in the list.
	 */
	view.isMarked = function(marking) {
		if (Is.array(marking)) {
			Each.pair(marking, function(idx, mark) {
				if (view.is.marked[toMarking(mark)]) {
					return true;
				}
			});
			return false;
		}
		return view.is.marked[toMarking(marking)] === true;
	};

	/*
	 **** isNotMarked(marking)
	 *	  - Returns whether this view does not have the given marking or list of markings.
	 */

	/**
	 * Returns whether this view does not have the given marking or any of the markings in the list.
	 * @param  {(str|str[])} marking - Marking or list of markings to be tested within this element.
	 * @return {Boolean} - Returns whether this view does not have the given marking or any of the markings in the list.
	 */
	view.isNotMarked = function(marking) {
		if (Is.array(marking)) {
			for (var i = 0 ; i < marking.length ; i++) {
				if (view.is.marked[toMarking(marking[i])]) {
					return false;
				}
			}
			return true;
		}
		return view.is.marked[toMarking(marking)] === false;
	};

	/*
	 **** toggleMark()
	 *	  - Toggles inclusion/exclusion of all markings.
	 *
	 **** toggleMark(marking)
	 *	  - Toggles inclusion/exclusion of the given marking.
	 */

	/**
	 * Toggles inclusion/exclusion of all markings or the given marking/list of markings.
	 * @param  {(str|str[])} [marking] - Marking or list of markings to be toggled within this element.
	 * @return {Firebase} - Returns FirebaseView.
	 */
	view.toggleMark = function(marking) {
		var i;
		if (Is.str(marking)) {
			if (view.isMarked(marking)) {
				view.unmark(marking);
			}
			else {
				view.mark(marking);
			}
		}
		else if (Is.array(marking)) {
			for (i = 0 ; i < marking.length ; i++) {
				view.toggleMark(marking[i]);
			}
		}
		else if (Is.undef(marking)) {
			for (i in view.is.marked) {
				view.toggleMark(view.is.marked[i]);
			}
		}
		return view;
	};

	/*
	 **** markAs(marking)
	 *    - Removes all markings and only marks the given marking.
	 */

	/**
	 * Removes all markings and only marks the given marking.
	 * @param  {str} marking - Marking to be given to view.
	 * @return {FirebaseView} - Returns FirebaseView.
	 */
	 view.markAs = function(marking) {
	 	view.unmark();
	 	view.mark(marking);
	 	return view;
	 };

	/*
	 **** markIf(condition, trueMark, falseMark)
	 *	  - Adds the trueMark to this view if the condition is true, and the falseMark
	 *		otherwise.
	 */

	/**
	 * Adds the trueMark to this view if the condition is true, and the falseMark
	 *		otherwise.
	 * @param  {boolean} condition - Condition which determines which mark is applied.
	 * @param  {str} trueMark - Mark applied if condition is true.
	 * @param  {str} falseMark - Mark applied if condition is false.
	 * @return {FirebaseView} - Returns FirebaseView.
	 */
	view.markIf = function(condition, trueMark, falseMark) {
		if (Is.def(trueMark))
			view.is.marked[toMarking(trueMark)] = (condition) ? true : false;
		if (Is.def(falseMark))
			view.is.marked[toMarking(falseMark)] = (condition) ? false : true;
		refreshMarking();
		return view;
	};

	/*
	 **** attribute(attribute)
	 *    - Returns the value of the given attribute.
	 *
	 **** attribute(attributes)
	 *    - Sets the attributes of this element to the given attribute-value object mapping.
	 *
	 **** attribute(attribute, value)
	 *	  - Sets the attribute of this element to the given value.
	 */

	/**
	 * Returns the value of the given attribute or sets the value of this given attribute to the given value.
	 * @param  {(str|Object)} a - Attribute/mapping of attributes to be returned or set.
	 * @param  {str} [v] - Value of attribute to be set.
	 * @return {FirebaseView} - Returns FirebaseView.
	 */
	view.attribute = function(a, v) {
		if (Is.str(a) && Is.str(v)) {
			view.is.attributed[a] = v;
			view.element.setAttribute(a, v);
		}
		else if (Is.obj(a)) {
			Each.pair(a, function(attr, val) {
				view.attribute(attr, val);
			});
		}
		else if (Is.str(a)) {
			return view.is.attributed[a];
		}
		return view;
	};

	/**
	 * Sets attribute if condition is true.
	 * @param  {boolean} c - Condition that determines whether attribute is set.
	 * @param  {str} a - Attribute to be set.
	 * @param  {str} v - Value for attribute to be set to.
	 * @return {FirebaseView} - Returns FirebaseView.
	 */
	view.attributeIf = function(c, a, v) {
		if (c) view.attribute(a, v);
		return view;
	};

	/*
	 **** style(style)
	 *    - Returns the value of the given style.
	 *
	 **** style(styles)
	 *    - Sets the styles of this element to the given style-value object mapping.
	 *
	 **** style(style, value)
	 *	  - Sets the style of this element to the given value.
	 */

	/**
	 * Returns the value of the given style or sets the value of this given style to the given value.
	 * @param  {(str|Object)} s - Style/mapping of styles to be returned or set.
	 * @param  {str} [v] - Value of style to be set.
	 * @return {FirebaseView} - Returns FirebaseView.
	 */
	view.style = function(s, v) {
		if (Is.str(s)) {
			if (Is.str(v)) {
				// Color rewriting
				if ((s == 'color' || s == 'background') && Is.def(On.color[v]) )
					view.element.style[s] = On.color[v];
				else view.element.style[s] = v;
			}
			else if (Is.num(v)) {
				view.element.style[s] = v + 'px';
			}
			else if (Is.bool(v)) {
				if (Is.def(view.element.style[s]) && v === false) {
					view.element.style[s] = null;
				}
			}
			else {
				return view.element.style[s];
			}
		}
		else if (Is.obj(s)) {
			Each.pair(s, function(st, stv) {
				view.style(st, stv);
			});
		}
		return view;
	};

	/**
	 * Sets style if condition is true.
	 * @param  {boolean} c - Condition that determines whether style is set.
	 * @param  {str} s - Style to be set.
	 * @param  {str} v - Value for style to be set to.
	 * @return {FirebaseView} - Returns FirebaseView.
	 */
	view.styleIf = function(c, s, v) {
		if (c) view.style(s, v);
		return view;
	};

	/*
	 **** each(function(id, view) { })
	 *    - Iterates the function with the given arguments over the id-view mapping of
	 *		this view in no particular order.
	 */

	/**
	 * Iterates the function with the given arguments over the id-view mapping of
	 *		this view in no particular order.
	 * @param  {function} f - Function called each iteration which parameter view.
	 * @return {FirebaseView} - Returns FirebaseView
	 */
	view.each = function(f) {
		if (Is.func(f)) {
			Each.pair(view.is.parentOf, f);
		}
		return view;
	};

	/*
	 **** forEach(function(view) { })
	 *    - Iterates the function with the given arguments over each child of this
	 * 		view in the order of the children.
	 */

	/**
	 * Iterates the function with the given arguments over each child of this view in the order of the children.
	 * @param  {function} f - Function called each iteration which parameter view.
	 * @return {FirebaseView} - Returns FirebaseView
	 */
	view.forEach = function(f) {
		if (Is.func(f)) {
			Each.value(view.is.ordering, function(id) {
				f(view.is.parentOf[id], id);
			});
		}
		return view;
	};

	/**
	 * Run the function with the given data and modifier function.
	 */

	/**
	 * Run the function with the given data and modifier function.
	 * @param  {function} v - documentation needed
	 * @param  {function} f - docucumenation needed
	 * @param  {function} t - documentation needed
	 * @return {FirebaseView}  - returns FirebaseView
	 */
	view.with = function(v, f, t) {
		if (Is.func(v))
			v(view);
		else if (Is.def(v)) {
			if (Is.func(f))
				f(v, view);
			else if (Is.array(f))
				Each.value(f, function(_f) { view.with(v, _f); });
			else if (Is.obj(f)) {
				t = t || Is.type(v);
				if (f[t]) f[t](v, view);
			}
		}
		return view;
	};

	// Attaches DOM listeners
	var onElementListen = function(e) {
		// Single clicking DOM event
		if (! view.is.handlingListener.click &&
			(e == 'click' || e == 'double click')) {

			view.is.handlingListener.click = true;
			view.element.addEventListener('click', function(e) {
				// Stop propagation by default
				if (! view.is.propagating)
					e.stopPropagation();

				if (view.is.handling['double click']) {
					var now = new Date().getTime();
					// Fire a double click or click event based on speed
					view.on((now - view.is.clickedAtTime < view.is.doubleClicking) ? 'double click' : 'click');
					view.is.clickedAtTime = now;
				}
				else view.on('click');
			});
		}
		// Hovering event
		else if (! view.is.handlingListener.hover &&
			(e == 'mouse' || e == 'mouseover' || e == 'mouseout')) {

			view.is.handlingListener.hover = true;
			view.element.addEventListener('mouseover', function(e) {
				view.is.hovered = true;
				view.on('mouseover');
			});
			view.element.addEventListener('mouseout', function(e) {
				view.is.hovered = false;
				view.on('mouseout');
			});
		}
		else if (! view.is.handlingListener.resize && e == 'resize') {
			view.is.handlingListener.resize = true;

			// Attach resize handler via jQuery
			$(window).resize(function() {
				view.on('resize');
			});
			// Ensure the view is sized on birth.
			view.on('birth', function() {
				view.on('resize');
			});
		}
		else if (! view.is.handlingListener.key &&
			(e == 'key' || e == 'keyup' || e == 'keydown' || e == 'keypress')) {
			view.is.handlingListener.key = true;
			view.is.key = {};

			view.element.addEventListener('keyup', function(e) {
				delete view.is.key[e.which];
				view.on(['key', 'keyup']);
			});

			view.element.addEventListener('keydown', function(e) {
				view.is.key[e.which] = true;
				view.on(['key', 'keydown']);
			});

			view.element.addEventListener('keypress', function(e) {
				view.on(['key', 'keypress']);
			});
		}
	};

	/*
	 **** on(event)
	 *    - Triggers the given event.
	 *
	 **** on(events)
	 *    - Triggers the given list of events.
	 *
	 **** on(eventFunctionMapping)
	 *    - Iterates over the event-function mapping and attaches each event listener to its corresponding
	 *      function in the mapping.
	 *
	 **** on(event, function(view) { })
	 *    - When the given event is triggered, the callback function is called with a reference to this view.
	 *
	 **** on(eventListener, function(event) { })
	 *
	 */


	/**
	 * When the given event is triggered, the callback function is called with a reference to this view.
	 * @param  {str} e - event that once is triggered, runs the callback function.
	 * @param  {function} f  - callback function to run once event is triggered.
	 * @return {FirebaseView} -  returns FirebaseView.
	 */
	view.on = function(e, f) {
		// For adding new listeners.
		if (Is.str(e)) {
			if (Is.func(f)) {
				// Create the list for event handlers
				if (Is.undef(view.is.handling[e]))
					view.is.handling[e] = [];
				// Push the callback onto the list
				view.is.handling[e].push(f);
				onElementListen(e);
			}
			else {
				// If the view has a one-time handler for this function, it gets triggered first, then removed.
				if (view.is.handlingOnce[e]) {
					Each.value(view.is.handlingOnce[e], function(handler) {
						handler(view, f);
					});
					delete view.is.handlingOnce[e];
				}
				// If the view is handling this event, iterate over the handlers with the view.
				if (view.is.handling[e])
					Each.value(view.is.handling[e], function(handler) {
						handler(view, f);
					});
			}
		}
		// For event lists.
		else if (Is.array(e)) {
			Each.value(e, function(ev) {
				view.on(ev, f);
			});
		}
		return view;
	};

	/*
	 **** once(event)
	 *    - Triggers the given event and removes the callback listener upon completion.
	 *
	 **** once(events)
	 *    - Triggers the given list of events and removes them upon completion.
	 *
	 **** once(eventFunctionMapping)
	 *    - Iterates over the event-function mapping and attaches each event listener to its corresponding
	 *      function in the mapping.
	 *
	 **** once(event, function(view) { })
	 *    - When the given event is triggered, the callback function is called with a reference to this view.
	 *
	 **** once(eventListener, function(event) { })
	 *    - For events in view.is.addingListener, attaches the native function to the element. Note that if
	 *		the function is triggered by on(eventListener), the callback function receives a reference to the
	 *		view and not the native JavaScript event object. Therefore, it is necessary to check the event input
	 *		to ensure its type before using it.
	 */

	/**
	 *    - For events in view.is.addingListener, attaches the native function to the element. Note that if
	 *		the function is triggered by on(eventListener), the callback function receives a reference to the
	 *		view and not the native JavaScript event object. Therefore, it is necessary to check the event input
	 *		to ensure its type before using it.
	 * @param  {str} e - event that triggers callback function
	 * @param  {function} f - callback function that is triggered by event.
	 * @return {FirebaseView} - returns FirebaseView.
	 */


	view.once = function(e, f) {
		if (Is.str(e)) {
			if (Is.func(f)) {
				if (! view.is.handlingOnce[e])
					view.is.handlingOnce[e] = [];
				view.is.handlingOnce[e].push(f);
				onElementListen(e);
			}
			else if (Is.str(f)) {
				view.is.handlingOnce[e].push(function() {
					view.on(f);
				});
			}
			else view.on(e);
		}
		return view;
	};

	/*
	 **** off()
	 *    - Removes all event handlers.
	 *
	 **** off(event)
	 *    - Removes all handlers for the given event.
	 *
	 */

	/**
	 * removes event handler for given event.
	 * @param  {str} e  - event handler to remove.
	 * @param  {function} f - callback function
	 * @return {FirebaseView} - Returns FirebaseView.
	 */
	view.off = function(e, f) {
		// Turns off the event if the view is handling it.
		if (Is.str(e)) {
			if (Is.func(f)) {
				if (view.is.handling.indexOf(f) >= 0)
					view.is.handling.slice(view.is.handling.indexOf(f), 1);
				if (view.is.handlingOnce.indexOf(f) >= 0)
					view.is.handlingOnce.slice(view.is.handling.indexOf(f), 1);
			}
			else {
				if (view.is.handling[e])
					delete view.is.handling[e];
				if (view.is.handlingOnce[e])
					delete view.is.handlingOnce[e];
			}
		}
		// Turns off all events.
		else if (Is.undef(e)) {
			Each.pair(view.is.handling, function(ev) {
				view.off(ev);
			});
		}
		return view;
	};

	/*
	 **** broadcast(event)
	 *	  - Sends the event to this view and recursively to the children of this view.
	 */

	/**
	 * Sends the event to this view and recursively to the children of this view.
	 * Needs documentation
	 * @param  {array} e  - array of views to get event.
	 * @param  {str} c  - children
	 * @param  {[type]} as - child view
	 * @return {FirebaseView}  - returns FirebaseView.
	 */
	view.broadcast = function(e, c, as) {
		if (Is.array(e)) {
			Each.value(e, function(ev) {
				view.broadcast(ev, c);
			});
		}
		else if (Is.obj(e)) {
			Each.pair(e, function(ev, ch) {
				view.broadcast(ev, ch);
			});
		}
		else if (Is.str(e)) {
			if (Is.view(c)) {
				view.on(e, function(_, a) {
					c.on(as || e, a);
				});
			}
			else if (Is.str(c)) {
				view.on(e, function(_, a) {
					view.child(c).on(e, a);
				});
			}
			else if (Is.func(c)) {
				view.on(e, function(_, a) {
					view.child(c()).on(e, a);
				});
			}
			else {
				view.on(e);
				if (! view.isEmpty()) {
					view.forEach(function(child) {
						child.broadcast(e);
					});
				}
			}
		}
		return view;
	}

	/*
	 **** isNow(state)
	 *	  - Assigns the given state to this view.
	 */

	/**
	 * Assigns the given state to this view.
	 * @param  {[type]}  t - class to add to given view.
	 * @param  {FirebaseView}  v  - FirebaseView.
	 * @return {Boolean}  - returns whether or not given state is assigned to given view.
	 */
	view.isNow = function(t, v) {
		view.is[t] = (Is.def(v)) ? v : true;
		if (view.is.markable[t])
			view.mark('is ' + t);
		return view;
	};

	/*
	 **** isNoLonger(state)
	 *	  - Removes the given state from this view.
	 */

	/**
	 * removes the given state from this view.
	 * @param  {FirebaseView}  t - FirebaseView to check given state.
	 * @return {Boolean}  - returns whether or not given state is removed from view.
	 */
	view.isNoLonger = function(t) {
		if (view.is[t])
			view.is[t] = false;
		if (view.is.markable[t])
			view.unmark('is ' + t);
		return view;
	};

	/*
	 **** isNot(state)
	 *	  - Returns whether this view is not set to the given state.
	 */

	/**
	 * Returns whether this view is not set to the given state.
	 * @param  {FirebaseView}  t - FirebaseView to check given state status.
	 * @return {Boolean}   - Returns whether this view is not set to the given state.
	 */
	view.isNot = function(t) {
		return view.is[t] == false;
	};

	/*
	 **** fadeIn(args)
	 *	  - Mirrors the jQuery fadeIn function.
	 */

	/**
	 * Mirrors jQuery fadeIn function.
	 * @param  {[type]} arg1 - refer to jQuery fadeIn docs
	 * @param  {[type]} arg2 - refer to jQuery fadeIn docs
	 * @return {[type]}  - mirrors jQuery fadeIn function.
	 */
	view.fadeIn = function(arg1, arg2) {
		if (! view.is.visible) {
			view.$.fadeIn(arg1, arg2);
			view.is.visible = true;
		}
		return view;
	};

	/*
	 **** fadeOut(args)
	 *	  - Mirrors the jQuery fadeOut function.
	 */

	/**
	 * Mirrors jQuery fadeOut function.
	 * @param  {number} arg1 - refer to jQuery fadeOut docs
	 * @param  {function} arg2 - refer to jQuery fadeOut docs
	 * @return {[type]}  - mirrors jQuery fadeOut function.
	 */
	view.fadeOut = function(arg1, arg2) {
		if (view.is.visible) {
			view.$.fadeOut(arg1, arg2);
			view.is.visible = false;
		}
		return view;
	};

	/*
	 **** slideToggle(args)
	 *	  - Mirrors the jQuery slideToggle function.
	 */

	/**
	 * Mirrors jQuery slideToggle function.
	 * @param  {str} arg1 - refer to jQuery slideToggle docs
	 * @param  {str} arg2 - refer to jQuery slideToggle docs
	 * @return {FirebaseView}  - returns FirebaseView
	 */
	view.slideToggle = function(o, c) {
		if (o === 'open') {
			if (! view.is.visible) {
				view.$.slideToggle(o, c);
				view.is.visible = true;
			}
		}
		else if (o === 'close') {
			if (view.is.visible) {
				view.$.slideToggle(o, c);
				view.is.visible = false;
			}
		}
		else {
			view.$.slideToggle(o, c);
			view.is.visible = ! view.is.visible;
		}
		return view;
	};

	/**
	 * Scrolls to a certain location over a specified duration.
	 * @param  {str} arg1 - position to scroll to
	 * @param  {str} arg2 - duration of scroll
	 */
	view.scroll = function(to, duration) {
		if (Is.str(to) && view.hasChild(to))
			to = view.child(to).offset('top');
		else if (Is.view(to))
			to = to.offset('top');
		else if (Is.func(to))
			view.$.scroll(function() {
				if (! view.is.scrolling)
					to(view.$.scrollTop());
			});

		if (Is.num(to)) {
			view.is.scrolling = true;
			view.$.animate({
		        scrollTop: to
		    }, duration || 400);
			setTimeout(function() {
				view.is.scrolling = false;
			}, duration || 400);
		}
	};

	/**
	 * Returns the width of a given div.
	 * @param  {str} opt - needs documentation.
	 * @return {number}  - returns width of client.
	 */
	view.width = function(opt) {
		if (opt != null) {
			if (opt == 'client') {
				return view.element.clientWidth;
			}
			if (opt == 'scroll') {
				return view.element.scrollWidth;
			}
			return 0;
		}
		return view.element.clientWidth;
	};

	/**
	 * Returns the height of a given div.
	 * @param  {str} opt - needs documentation
	 * @return {number}  - returns height of client.
	 */
	view.height = function(opt) {
		if (opt != null) {
			if (opt == 'client') {
				return view.element.clientHeight;
			}
			if (opt == 'scroll') {
				return view.element.scrollHeight;
			}
			return 0;
		}
		return view.element.clientHeight;
	};

	/**
	 * Get the current coordinates of the first element in the set of matched elements, relative to the document.
	 * @param  {str} direction - refer to jQuery offset docs
	 * @return {[type]} -
	 */
	view.offset = function(direction) {
		if (direction == 'left') {
			return view.element.offsetLeft;
		}
		else if (direction == 'top') {
			return view.element.offsetTop;
		}
		else if (direction == 'right') {
			if (view.hasParent())
				return view.parent().width() - view.element.offsetLeft;
			else return 0;
		}
		else return 0;
	};

	/**
	 * needs documentation
	 * @param  {[type]} f [description]
	 * @return {[type]}   [description]
	 */
	view.responsive = function(f) {
		onElementListen('resize');
		if (Is.obj(f)) {
			view.on('resize', function() {
				var minWidth = 0,
					lastSize = view.is.responsiveSize;

				// Pick the responsive size
				view.is.responsiveSize = null;
				Each.pair(f, function(size, threshold) {
					// Sentinel value for the view's width
					if (threshold == 0)
						threshold = view.width();

					if (! view.is.responsiveSize ||
						( view.width() > minWidth && view.width() <= threshold)) {
						view.is.responsiveSize = size;
						minWidth = threshold;
					}
				});

				if (view.is.responsiveSize != lastSize) {
					if (lastSize)
						view.unmark(lastSize);
					view.mark(view.is.responsiveSize);
				}
			});
		}
		else if (Is.func(f)) {
			view.on('resize', f);
		}
		return view;
	};

	return view;
};