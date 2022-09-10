// ==UserScript==
// @name         ELTE GTK Inform
// @namespace    https://glorantv.web.elte.hu/
// @version      1.0
// @description  Jó rendszer szeretem
// @author       Gerber Lóránt Viktor
// @homepage     https://glorantv.web.elte.hu/
// @match        https://inform.gtk.elte.hu/index.php?site=2*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=elte.hu
// @updateURL    https://raw.githubusercontent.com/glorantq/elte-gtk-export/main/ELTE-GTK-Inform.user.js
// @downloadURL  https://raw.githubusercontent.com/glorantq/elte-gtk-export/main/ELTE-GTK-Inform.user.js
// @supportURL   https://github.com/glorantq/elte-gtk-export/issues
// ==/UserScript==

(function() {
    'use strict';

    let UUID = (function() {
        var self = {};
        var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
        self.generate = function() {
            var d0 = Math.random()*0xffffffff|0;
            var d1 = Math.random()*0xffffffff|0;
            var d2 = Math.random()*0xffffffff|0;
            var d3 = Math.random()*0xffffffff|0;
            return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
                lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
                lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
                lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
        }

        return self;
    })();

    let icalString = (str) => {
        return str.replaceAll(",", "\\,").replaceAll("\n", "\\n");
    };

    let icalDatetime = (date, time) => {
        return `${date.replaceAll(".", "")}T${time.replaceAll(":", "")}00`;
    };

    let icalDate = (date) => {
        return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
    };

    let icalDescription = (course) => {
        return icalString(`${course.courseType}\\n\\n(${course.teachers})`);
    };

    let courseToVevent = (course) => {
        let calData = [];
        calData.push("BEGIN:VEVENT\r\n");
        calData.push("DTSTART:");
        calData.push(icalDatetime(course.date, course.time.split("-")[0]));
        calData.push("\r\nDTEND:");
        calData.push(icalDatetime(course.date, course.time.split("-")[1]));
        calData.push("\r\nDTSTAMP:");
        calData.push(icalDate(new Date()));
        calData.push("\r\nUID:");
        calData.push(`${UUID.generate()}@export.gtk.inform`);
        calData.push("\r\nSUMMARY:");
        calData.push(icalString(course.name));
        calData.push("\r\nDESCRIPTION:");
        calData.push(icalDescription(course));
        calData.push("\r\nLOCATION:");
        calData.push(icalString(course.location));
        calData.push("\r\nEND:VEVENT");
        return calData.join("");
    };

    let writeIcalendar = (courses) => {
        let calData = [];
        calData.push("BEGIN:VCALENDAR");
        calData.push("\r\nVERSION:2.0");
        calData.push("\r\nPRODID:-//glorantv.web.elte.hu//ELTE GTK Inform Export");
        calData.push("\r\nCALSCALE:GREGORIAN");
        calData.push("\r\nBEGIN:VTIMEZONE");
        calData.push("\r\nTZID:Europe/Budapest");
        calData.push("\r\nLAST-MODIFIED:20201011T015911Z");
        calData.push("\r\nTZURL:http://tzurl.org/zoneinfo-outlook/Europe/Budapest");
        calData.push("\r\nX-LIC-LOCATION:Europe/Budapest");
        calData.push("\r\nBEGIN:DAYLIGHT");
        calData.push("\r\nTZNAME:CEST");
        calData.push("\r\nTZOFFSETFROM:+0100");
        calData.push("\r\nTZOFFSETTO:+0200");
        calData.push("\r\nDTSTART:19700329T020000");
        calData.push("\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU");
        calData.push("\r\nEND:DAYLIGHT");
        calData.push("\r\nBEGIN:STANDARD");
        calData.push("\r\nTZNAME:CET");
        calData.push("\r\nTZOFFSETFROM:+0200");
        calData.push("\r\nTZOFFSETTO:+0100");
        calData.push("\r\nDTSTART:19701025T030000");
        calData.push("\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU");
        calData.push("\r\nEND:STANDARD");
        calData.push("\r\nEND:VTIMEZONE\r\n");

        for(let course of courses) {
            calData.push(courseToVevent(course));
            calData.push("\r\n");
        }

        calData.push("END:VCALENDAR");
        return calData.join("").replaceAll("\r\n", "\n").replaceAll("\r", "").replaceAll("\n", "\r\n");
    };

    let writeCsv = (courses) => {
        let csvData = [];
        csvData.push("Subject, Start Date, Start Time, End Time, Description, Location");

        for(let course of courses) {
            csvData.push(`"${course.name}", ${course.date}, ${course.time.split("-")[0]}, ${course.time.split("-")[1]}, ${course.courseType}; (${course.teachers.replaceAll(",", ";")}), "${course.location}"`.replaceAll("\n", "; "));
        }

        return csvData.join("\n");
    };

    let parseTableRow = (element) => {
        let parsedObject = {};

        for(let dataElement of element.children) {
            let attribute = dataElement.getAttribute("data-label").toLowerCase();

            switch(attribute) {
                case "nap":
                    parsedObject.date = dataElement.innerText;
                    break;

                case "idősáv":
                    parsedObject.time = dataElement.innerText;
                    break;

                case "tárgynév":
                    parsedObject.name = dataElement.innerText.split("\n")[0];
                    break;

                case "kurzustípus":
                    parsedObject.courseType = dataElement.innerText;

                    var boldText = dataElement.getElementsByTagName("b");

                    if(boldText.length > 0) {
                        parsedObject.restrictions = boldText[0].textContent;
                    }
                    break;

                case "tanterem":
                    parsedObject.location = dataElement.innerText;
                    break;

                case "oktatók":
                    parsedObject.teachers = dataElement.innerText;
                    break;
            }
        }

        return parsedObject;
    };

    let validateRestrictions = (course, restrictionString) => {
        if(restrictionString == undefined) {
            return true;
        }

        if(course.restrictions == undefined || course.restrictions == "*") {
            return true;
        }

        let allowedLetters = restrictionString.split(",");
        for(let letter of allowedLetters) {
            if(course.restrictions.includes(letter.trim())) {
                return true;
            }
        }

        return false;
    };

    let saveTextFile = (name, content) => {
        let saveFile = document.createElement("a");
        saveFile.href = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
        saveFile.download = name;

        saveFile.click();
    };

    let getCoursesArray = () => {
        let mainBlock = document.getElementById("main").getElementsByClassName("main-block")[0];
        let timetableContainer = mainBlock.getElementsByTagName("table")[0].getElementsByTagName("tbody")[0];

        let allowedRestrictions = window.prompt("Kurzusmegszorítások (pl. C, H):");

        let courseArray = [];
        for(let tableRow of timetableContainer.children) {
            let parsedObject = parseTableRow(tableRow);

            if(validateRestrictions(parsedObject, allowedRestrictions)) {
                courseArray.push(parsedObject);
            }
        }

        return courseArray;
    };

    let onExportIcsClick = (e) => {
        let courseArray = getCoursesArray();
        let calendarData = writeIcalendar(courseArray);
        saveTextFile("Órarend.ics", calendarData);
    };

    let onExportCsvCick = (e) => {
        let courseArray = getCoursesArray();
        let calendarData = writeCsv(courseArray);
        saveTextFile("Órarend.csv", calendarData);
    };

    let onHelpClick = () => {
        alert(".csv - Google Calendar\n.ics - Konkrétan minden");
    };

    let createButton = (id, text, click) => {
        let button = document.createElement("button");
        button.innerText = text;
        button.id = id;
        button.style = "cursor: pointer;";
        button.onclick = click;

        return button;
    };

    let modifyPage = () => {
        let mainBlock = document.getElementById("main").getElementsByClassName("main-block")[0];
        let timetableHeader = mainBlock.getElementsByTagName("h1")[0];

        timetableHeader.style = "display: flex; flex-direction: row; justify-content: space-between; align-items: center;";

        let buttonsContainer = document.createElement("div");
        buttonsContainer.id = "userscript-buttons-container";
        buttonsContainer.style = "margin-right: 1rem;";

        buttonsContainer.append(createButton("userscript-export-button", "Export (.ics)", onExportIcsClick));
        buttonsContainer.append(createButton("userscript-export-csv-button", "Export (.csv)", onExportCsvCick));
        buttonsContainer.append(createButton("userscript-help-button", "?", onHelpClick));

        timetableHeader.append(buttonsContainer);
    };

    modifyPage();
})();