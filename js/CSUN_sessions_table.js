/*jslint browser: true, devel: true, nomen: true, plusplus: true*/
/*global jQuery, $, console, noLRUpdates, lrNotifier*/


$(document).ready(
    function () {
        "use strict";
        var columnTotal = 9,
            columnHeaderIds = ["title", "dateAndTime", "location", "trackTopic", "keywords", "sessionType", "abstract", "presenters", "sessionId"],
            columnHeaderTitles = ["Title", "Date And Time", "Location", "Track / Topic", "Keywords", "Session Type", "Abstract", "Presenter(s)", "Session ID"],
            aliases = {
                title: ["topic", "t"],
                presenters: ["presenter", "speaker", "speakers", "p"],
                dateAndTime: ["day", "time", "daytime", "timeslot", "slot", "hour", "d", "h"],
                location: ["location", "room", "l"],
                trackTopic: ["track", "topic", "tt"],
                sessionType: ["session", "type", "s"],
                keywords: ["key", "keyword", "k"]
            },
            indices = {
                day: {},
                location: {},
                trackTopic: {},
                keywords: {},
                sessionType: {},
                presenters: {}
            },
            initialized = false,
            groupBy = $("#groupBy").val(),
            filterBy = $("#filterBy").val(),
            rowAverage = 10,
            rowTotal = rowAverage,


            //TODO: Make reusable (no direct references or selectors, allow multiple instances on page)
            // global vars
            scrollBy = 3,
            $buttonArea = $(".cgi-PCButtonArea"),
            $outerContainer = $(".cgi-PCOuterContainer"),
            $scrollContainers = $('.cgi-PCScrollContainer', $outerContainer),
            $bodyTable = $('.cgi-PCBodyTable', $scrollContainers),
            $headerTable = $('.cgi-PCHeaderTable ', $scrollContainers),
            tableId = $bodyTable.attr("id"),
            sessionJSON;

        window.indices = indices;

        function entityDecode(value) {
            return $("<textarea/>").html(value).text();
        }

        function getColumns() {
            return $headerTable.find("tr:eq(0)").children("td,th");
        }

        function setTableWidth() {
            var columns = getColumns(),
                columnCount = columns.length;
            $scrollContainers.css("width", (columnCount * 300) + "px");
            $bodyTable.find("tr>th[colspan]").attr("colspan", columnCount);
        }

        function updateLiveRegion(msg, selector) {
            if (typeof noLRUpdates !== "undefined") {
                return;
            }
            if (lrNotifier && typeof lrNotifier.notify === "function") {
                lrNotifier.notify(msg, selector);
            } else {
                $("#" + tableId + "-liveRegion").text(msg);
            }
        }

        function updatePaginationControls(index, lastIndex, columnCount) {
            $(".prev").prop('disabled', index <= 0);
            $(".next").prop('disabled', lastIndex >= columnCount - 1);
        }

        function showColumnsPreAnim() {
            //toggleColumns(false);
            $scrollContainers.find(".cgi-PCTable").find("tr:not(.groupHeader) > *").removeClass("hiddenColumn");
        }

        function getScrollIndex() {
            return parseInt($bodyTable.data("scroll_index"), 10);
        }

        function setupLiveRegion() {
            if (typeof noLRUpdates !== "undefined") {
                return;
            }
            if (lrNotifier && typeof lrNotifier.setupNotifier === "function") {
                lrNotifier.setupNotifier();
            } else {
                $buttonArea.after("<p id='" + tableId + "-liveRegion' role='status' class='HiddenText' ></p>");
            }
        }

        function getVisibleColumnRange() {
            var range = [],
                scrollIndex = getScrollIndex(),
                i;
            for (i = scrollIndex; i < scrollIndex + scrollBy; i++) {
                range.push(i);
            }
            return range;
        }


        function getInvisibleColumnRange() {
            var range = [],
                columns = getColumns(),
                columnCount = columns.length,
                visibleRange = getVisibleColumnRange(),
                i;
            for (i = 0; i < columnCount; i++) {
                if ($.inArray(i, visibleRange) === -1) {
                    range.push(i);
                }
            }
            return range;
        }

        function toggleColumns(hide) {
            var range = hide ? getInvisibleColumnRange() : getVisibleColumnRange(),
                selector = "",
                i,
                columnsToUpdate;
            for (i = 0; i < range.length; i++) {
                if (i !== 0) {
                    selector += ", ";
                }
                selector += "tr:not(.groupHeader) > *:nth-child(" + (range[i] + 1) + ")";
            }
            columnsToUpdate = $scrollContainers.find(".cgi-PCTable").find(selector);
            if (hide) {
                columnsToUpdate.addClass("hiddenColumn");
            } else {
                columnsToUpdate.removeClass("hiddenColumn");
            }
        }


        function hideColumnsPostAnim() {
            toggleColumns(true);
        }

        function scrollToColumn(newIndex) {
            var columns = getColumns(),
                columnCount = columns.length,
                newLastIndex,
                updateMsg,
                newColumn,
                newPos,
                animating;
            if (isNaN(newIndex) || newIndex < 0) {
                newIndex = 0;
            } else if (newIndex > (columnCount - scrollBy)) {
                newIndex = columnCount - scrollBy;
            }
            newLastIndex = newIndex + scrollBy - 1;

            if ($bodyTable.data("scroll_index") === newIndex) {
                updateMsg = "Columns " + (newIndex + 1) + " to " + (newLastIndex + 1) + " were already scrolled into view";
                updateLiveRegion(updateMsg);
                return;
            }

            updatePaginationControls(newIndex, newLastIndex, columnCount);

            newColumn = columns.eq(newIndex);
            if (!newColumn.length) {
                return;
            }
            newPos = newColumn.position().left;
            showColumnsPreAnim();
            $bodyTable.data("scroll_index", newIndex);
            $bodyTable.data("scroll_lastvisibleindex", newLastIndex);

            animating = $scrollContainers.is(":animated");
            $scrollContainers.animate({
                left: "-" + newPos + "px"
            }, 500, null, function () {
                if ($(this).queue("fx").length <= 1) {
                    hideColumnsPostAnim();
                }
                if ($(this).is(".cgi-PCHeaderContainer")) {
                    var updateMsg = "Showing columns " + (newIndex + 1) + " to " + (newLastIndex + 1) + ", first column is " + $bodyTable.find("tr.sizerRow > *:nth-child(" + (newIndex + 1) + ")").text();
                    updateLiveRegion(updateMsg);
                }
            });
            $bodyTable.clearQueue();
            $bodyTable.find("tr > th .fixedRowHeading").animate({
                left: (newPos) + "px"
            }, 500);
        }

        function addPaginationControls() {
            var prevBtn,
                nextBtn,
                columns,
                columnCount,
                i;

            prevBtn = $("<button class='prev'>prev</button>").click(function (event) {
                scrollToColumn(getScrollIndex() - scrollBy);
            });

            nextBtn = $("<button class='next'>next</button>").click(function (event) {
                scrollToColumn(getScrollIndex() + scrollBy);
            });

            $buttonArea.empty();
            $buttonArea.append(prevBtn);
            columns = getColumns();
            columnCount = columns.length;

            $.each(columnHeaderIds, function (i, e) {
                //for (i = 0; i < columnCount; i++) {
                $("<button data-index='" + i + "' ><span class='HiddenText'>scroll table to column </span>" + (i + 1) + "</button>").click(function (event) {
                    scrollToColumn($(this).data("index"));
                }).appendTo($buttonArea);
            });

            $buttonArea.append(nextBtn);

            updatePaginationControls(0, scrollBy - 1, columnCount);
        }

        function toggleRowGroup($control, expand, batch) {
            var $headerRow,
                $headerCell,
                $bodyRows;
            if ($control.is("tbody")) {
                $headerRow = $control.find("tr.groupHeader").first();
                $control = $headerRow.find(".toggleRowGroup:eq(0)");
            } else if ($control.is("tr.groupHeader")) {
                $headerRow = $control;
                $control = $headerRow.find(".toggleRowGroup:eq(0)");
            } else {
                $headerRow = $control.closest("tr.groupHeader");
            }
            if (!$headerRow.length || !$control.length) {
                return;
            }
            $headerCell = $control.closest("th");

            if (expand === undefined) {
                expand = $control.data("hidden");
            }

            $bodyRows = $headerRow.nextAll("tr");
            if (expand) {
                $bodyRows.show();
                $headerRow.closest("tbody").attr("aria-expanded", "true");
                $control.html("<span aria-hidden='true'>- </span>Collapse<span class='HiddenText'> " + $headerCell.attr("abbr") + " row group</span>");
                $control.removeData("hidden");
                if (!batch) {
                    updateLiveRegion("Expanded row group: " + $headerCell.attr("abbr"));
                }
            } else {
                $bodyRows.hide();
                $headerRow.closest("tbody").attr("aria-expanded", "false");
                $control.html("<span aria-hidden='true'>+ </span>Expand<span class='HiddenText'> " + $headerCell.attr("abbr") + " row group</span>");
                $control.data("hidden", true);
                if (!batch) {
                    updateLiveRegion("Collapsed row group: " + $headerCell.attr("abbr"));
                }
            }
        }


        /* Functions for generating random sample data. NOT PART OF ACTUAL SOLUTION, DEMO PURPOSES ONLY*/
        function getCellContents(header, groupIndex, rowIndex, cellIndex) {
            var $content,
                $columnTitle,
                $close,
                cellHTML,
                $list;

            if (header) {
                cellHTML = columnHeaderTitles[cellIndex];
                $columnTitle = $("<div class='ColTitleWrapper'>" + cellHTML + "</div>");
                $close = $("<div class='colDeleteWrapper'><a href='#' class='deleteColumn'>Delete<span class='HiddenText'>" + cellHTML + " column</span></a></div>");
                $content = $close.add($columnTitle);
            } else {

                $content = sessionJSON[rowIndex][columnHeaderIds[cellIndex]];
                if ($content instanceof Array) {
                    $list = $("<ul></ul>");
                    $.each($content, function (i, e) {
                        var parts = e.split("\r\n"),
                            $item = $("<li></li>").appendTo($list);
                        if (parts.length === 2) {
                            $item.html(parts[0] + "<br /><span class='subValue'>" + parts[1] + "</span>");
                        } else {
                            $item.html(e);
                        }
                    });
                    return $list;
                }
            }
            return $content;
        }

        function addCell(header, groupIndex, rowIndex, cellIndex) {
            var hdrId = tableId + "-colHdr-" + cellIndex,
                headersIds = hdrId + " " + tableId + "-groupHdr-" + groupIndex,
                $cell = $(header ? "<th role='columnheader' abbr='" + columnHeaderTitles[cellIndex] + "'></th>" : "<td headers='" + headersIds + "' role='gridcell'></td>");
            $cell.append(getCellContents(header, groupIndex, rowIndex, cellIndex));
            return $cell;
        }

        function getTableHeaderRow() {
            var $tBody = $("<tbody role='presentation'></tbody>"),
                $row = $("<tr role='row'></tr>").appendTo($tBody),
                i;
            for (i = 0; i < columnTotal; i++) {
                $row.append(addCell(true, 0, 0, i));
            }
            return $tBody;
        }

        function getRow(header, groupIndex, rowIndex) {
            var $row = $("<tr role='row'></tr>"),
                i;
            for (i = 0; i < columnHeaderIds.length; i++) {
                $row.append(addCell(header, groupIndex, rowIndex, i));
            }
            return $row;
        }

        function getRowGroupHeader(groupIndex, groupId) {
            var $tr,
                $th,
                $fixedWrapper,
                $fixedText,
                $rowGroupTitle,
                rowGroupTitleText,
                $rightFloat,
                $moveRowGroupLink,
                $expandRowGroupLink;

            rowGroupTitleText = entityDecode(groupId);

            $tr = $("<tr class='groupHeader' role='row'></tr>");
            $th = $("<th id='" + tableId + "-groupHdr-" + groupIndex + "' scope='rowgroup' colspan='" + columnTotal + "' role='columnheader' abbr='" + rowGroupTitleText + "'></th>").appendTo($tr);
            $fixedWrapper = $("<div class='fixedRowWrapper'></div>").appendTo($th);
            $fixedText = $("<div class='fixedRowHeading'></div>").appendTo($fixedWrapper);
            $rowGroupTitle = $("<div class='rowGroupTitle'>" + rowGroupTitleText + "</div>").appendTo($fixedText);
            $rightFloat = $("<div class='rowGroupControls'></div>").appendTo($fixedText);
            //$moveRowGroupLink = $("<a role='button' class='moveRowGroup' href='#'>Move <span class='HiddenText'>" + rowGroupTitleText + " section</span>to top</a>").appendTo($rightFloat);
            $expandRowGroupLink = $("<a role='button' href='#' class='toggleRowGroup'><span aria-hidden='true'>-</span> Collapse<span class='HiddenText'> section " + rowGroupTitleText + " row group</span></a>").appendTo($rightFloat);
            return $tr;

        }

        function getRowGroup(groupIndex, groupId, idsInGroup) {
            var $rowGroup = $("<tbody class='rowGroup' role='rowgroup' aria-expanded='true' aria-label='" + groupId + "'></tbody>"),
                i;
            $rowGroup.append(getRowGroupHeader(groupIndex, groupId));
            $.each(idsInGroup, function (i, sessionIndex) {
                $rowGroup.append(getRow(false, groupIndex, sessionIndex));
            });
            return $rowGroup;
        }

        function getSizerRow() {
            var $tBody = $("<tbody role='presentation'></tbody>"),
                $row = $("<tr class='sizerRow' role='row'></tr>").appendTo($tBody),
                hdrId,
                i;
            for (i = 0; i < columnTotal; i++) {
                hdrId = tableId + "-colHdr-" + i;
                $row.append("<th role='columnheader' id='" + hdrId + "' role='columnheader'><span class='HiddenText'>" + columnHeaderTitles[i] + "</span></td>");
            }
            return $tBody;
        }

        function addTableContents(data) {
            var i,
                groupIds,
                groupIndex;
            $headerTable.append(getTableHeaderRow());
            groupIds = indices[groupBy];
            groupIndex = 0;
            $.each(groupIds, function (id, idsInGroup) {
                $bodyTable.append(getRowGroup(groupIndex, id, idsInGroup));
                groupIndex++;
            });
            $bodyTable.append(getSizerRow());

        }

        function add2Index(indexObj, propValue, sessionId) {
            if (!indexObj[propValue] || !(indexObj[propValue] instanceof Array)) {
                indexObj[propValue] = [];
            }
            indexObj[propValue].push(sessionId);
        }

        function buildTable(data) {
            addTableContents(data);
            addPaginationControls();
            setupLiveRegion();
            setTableWidth();
            $outerContainer.attr("role", "grid").attr("aria-readonly", "true").find(".cgi-PCTableWrapper").add($scrollContainers).add($bodyTable).add($headerTable).attr("role", "presentation");
            $bodyTable.data("scroll_index", "0");
            $bodyTable.data("scroll_lastvisibleindex", scrollBy - 1);
            toggleColumns(true);
        }

        function applyFilter(filterString) {

            var chunks,
                filterRules = [];
            // get filters
            chunks = filterString.split(";");
            $.each(chunks, function (i, e) {
                var pair,
                    filterRule,
                    ruleName,
                    ruleValue;
                if (e.indexOf(":") !== -1) {
                    pair = e.split(":");
                    ruleName = pair.shift();
                    ruleValue = pair.join(":");
                    filterRule = {
                        name: ruleName,
                        value: ruleValue
                    };

                    // allow for aliases
                    if ($.inArray(columnHeaderIds, filterRule.name) === -1) {
                        $.each(aliases, function (potentialColId, aliasSet) {
                            if ($.inArray(filterRule.name, aliasSet) !== -1) {
                                filterRule.name = potentialColId;
                                return false;
                            }
                        });
                    }
                } else {
                    filterRule = {
                        name: "title",
                        value: e
                    };
                }
                filterRules.push(filterRule);
            });

            $("#PCSampleTable tbody").show();
            $("#PCSampleTable tr:not(.sizerRow,.groupHeader)").show().filter(function (i) {
                var hide = false,
                    colIndex,
                    $row = $(this);

                $.each(filterRules, function (i, rule) {

                    colIndex = columnHeaderIds.indexOf(rule.name);
                    if (colIndex === -1) {
                        return;
                    }
                    if ($row.find("> td:eq(" + colIndex + ")").text().toLocaleLowerCase().indexOf(rule.value.toLowerCase()) === -1) {
                        hide = true;
                        return false;
                    }

                });
                return hide;
            }).hide();
            $("#PCSampleTable tbody").each(function (i, e) {
                var $group = $(this);
                if (!$group.find("tr:visible:not(.groupHeader)").length) {
                    $group.hide();
                }
            });

            updateLiveRegion("Showing " + $("#PCSampleTable tr:not(.sizerRow,.groupHeader):visible").length + " filtered results", "#filterStatus");
        }

        //init
        (function () {
            $("#filterForm").submit(function (e) {
                var newGroupBy,
                    newFilter,
                    tableReset;
                e.preventDefault();

                newGroupBy = $("#groupBy").val();
                if (newGroupBy && newGroupBy !== groupBy) {
                    groupBy = $("#groupBy").val();
                    $bodyTable.empty();
                    $headerTable.empty();
                    buildTable(sessionJSON);
                    updateLiveRegion("The table is now grouped by " + groupBy);
                    tableReset = true;
                }
                newFilter = $("#filterBy").val();
                if (newFilter && (newFilter !== filterBy || tableReset)) {
                    filterBy = newFilter;
                    applyFilter(filterBy);
                }
            });

            $("#expandAll,#collapseAll").click(function (e) {
                var expand = e.target.id === "expandAll";
                $bodyTable.find("tbody").each(function (i) {
                    toggleRowGroup($(this), expand, true);
                });
                updateLiveRegion("All " + groupBy + " row groups are now " + (expand ? "expanded" : "collapsed"));
            });

            $.getJSON("../json/csun15_sessions.json", function (data) {
                sessionJSON = data;
                window.sessionJSON = sessionJSON;
                $.each(data, function (sessionIndex, s) {
                    var sDay,
                        sKeywords,
                        sPresenters,
                        parts;
                    // Index Days
                    sDay = s.dateAndTime.match("^(Wednesday|Thursday|Friday).*")[1];
                    add2Index(indices.day, s.dateAndTime, sessionIndex);

                    // Index Locations
                    parts = s.location.split(",");
                    add2Index(indices.location, parts[0], sessionIndex);

                    //Index presenters
                    sPresenters = s.presenters;
                    $.each(sPresenters, function (i, e) {
                        add2Index(indices.presenters, e, sessionIndex);
                    });

                    //Index Track / topic 
                    add2Index(indices.trackTopic, s.trackTopic, sessionIndex);

                    //Index keywords
                    sKeywords = s.keywords;
                    $.each(sKeywords, function (i, e) {
                        add2Index(indices.keywords, e, sessionIndex);
                    });

                    //Index session type  
                    add2Index(indices.sessionType, s.sessionType, sessionIndex);

                });
                buildTable(data);
            });

            $bodyTable.on("click", " tr.groupHeader, tr.groupHeader > th .toggleRowGroup", function (event) {
                event.stopPropagation();
                event.preventDefault();
                toggleRowGroup($(this));
            });

            $bodyTable.on("keydown", "tr.groupHeader > th .toggleRowGroup", function (event) {
                if (event.which === 32) {
                    event.stopPropagation();
                    event.preventDefault();
                    $(this).click();
                }
            });


            $headerTable.on("click keydown", "tr > th .deleteColumn", function (event) {
                var $cell,
                    index,
                    columnName,
                    $toDelete,
                    moveFocusTo,
                    columns,
                    columnCount;
                if (event.type === "keydown" && event.which !== 32) {
                    return;
                }
                event.stopPropagation();
                event.preventDefault();
                $cell = $(this).closest("th,td");
                index = $cell.prop("cellIndex");
                columnName = $bodyTable.find("tr.sizerRow > *:nth-child(" + (index + 1) + ")").text();
                $toDelete = $headerTable.find("tr > *:nth-child(" + (index + 1) + ")");
                $toDelete = $toDelete.add($bodyTable.find("tr > *:nth-child(" + (index + 1) + ")"));

                columns = getColumns();
                columnCount = columns.length;
                if (index === columnCount - 1) {
                    moveFocusTo = columnCount - 1;
                } else {
                    moveFocusTo = index + 1;
                }

                $toDelete.remove();
                setTableWidth();
                showColumnsPreAnim();
                hideColumnsPostAnim();
                addPaginationControls();
                if (moveFocusTo >= 0) {
                    $headerTable.find("tr > *:nth-child(" + moveFocusTo + ") .deleteColumn").focus();
                }
                updateLiveRegion("column " + (index + 1) + "(" + columnName + ") was removed from the results table");
            });


            $bodyTable.on("click keydown", "tr.groupHeader > th .moveRowGroup", function (event) {
                var $table,
                    $rowGroup,
                    $headerCell;
                if (event.type === "keydown" && event.which !== 32) {
                    return;
                }
                event.stopPropagation();
                event.preventDefault();
                $table = $(this).closest("table.cgi-PCTable");
                $rowGroup = $(this).closest("tbody.rowGroup");
                $rowGroup.prependTo($table);
                $table.closest(".cgi-PCBodyWrapper").prop("scrollTop", 0);
                $(this).focus();
                $headerCell = $(this).closest("th");
                updateLiveRegion($headerCell.attr("abbr") + " row group has moved to the top of the results table");
            });
        }());
    }
);