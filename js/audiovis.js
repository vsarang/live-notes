var LiveRenderer = {
  MARGIN: 100,
  STAVE_WIDTH: 400,
  STAVE_HEIGHT: 150,
  BAR_DURATION: 1000,

  init: function(canvas) {
    LiveRenderer.canvas = canvas;
    LiveRenderer.canvas.height = LiveRenderer.STAVE_HEIGHT + LiveRenderer.MARGIN * 2;
    LiveRenderer.canvas.width = window.innerWidth;
    LiveRenderer.renderer = new Vex.Flow.Renderer(LiveRenderer.canvas,
        Vex.Flow.Renderer.Backends.CANVAS);
    LiveRenderer.context = LiveRenderer.renderer.getContext();
    LiveRenderer.tempCanvas = document.createElement('canvas');

    LiveRenderer.bookmark = {
      x: LiveRenderer.MARGIN,
      y: LiveRenderer.MARGIN
    };

    LiveRenderer.lastBar = {
      beams: [],
      notes: [],
      stave: new Vex.Flow.Stave(
          LiveRenderer.bookmark.x,
          LiveRenderer.bookmark.y,
          LiveRenderer.STAVE_WIDTH)
    };
    LiveRenderer.lastBar.stave.addClef('treble').setContext(LiveRenderer.context).draw();
  },

  addSample: function(noteCode, sampleDuration, silence) {
    while (sampleDuration > 0) {
      var barDuration = LiveRenderer.remainingDuration(LiveRenderer.lastBar.notes);

      if (barDuration === 0) {
        LiveRenderer.nextBar();
        barDuration = LiveRenderer.remainingDuration(LiveRenderer.lastBar.notes);
      }

      var clippedDuration = 0;
      if (sampleDuration > barDuration) {
        clippedDuration = sampleDuration - barDuration;
        sampleDuration = barDuration;
      }

      var notes = LiveRenderer.getNotes(noteCode, sampleDuration, silence);
      notes.forEach(function(note) {
        if (note instanceof Array) {
          LiveRenderer.lastBar.notes = LiveRenderer.lastBar.notes.concat(note);
        } else {
          LiveRenderer.lastBar.notes.push(note);
        }
      });

      sampleDuration = clippedDuration;
    }
  },

  addSilence: function(duration) {
    LiveRenderer.addSample('b/4', duration, true);
  },

  nextBar: function() {
    LiveRenderer.renderBar(LiveRenderer.lastBar);
    LiveRenderer.lastBar = {
      beams: [],
      notes: [],
      stave: undefined
    };

    LiveRenderer.bookmark.x += LiveRenderer.STAVE_WIDTH;
    if (LiveRenderer.bookmark.x +
        LiveRenderer.STAVE_WIDTH +
        LiveRenderer.MARGIN > LiveRenderer.canvas.width) {
      LiveRenderer.tempCanvas.width = LiveRenderer.canvas.width;
      LiveRenderer.tempCanvas.height = LiveRenderer.canvas.height;
      LiveRenderer.tempCanvas.getContext('2d').drawImage(LiveRenderer.canvas, 0, 0);
      LiveRenderer.canvas.height += LiveRenderer.STAVE_HEIGHT;
      LiveRenderer.context.drawImage(LiveRenderer.tempCanvas, 0, 0);

      LiveRenderer.bookmark.y += LiveRenderer.STAVE_HEIGHT;
      LiveRenderer.bookmark.x = LiveRenderer.MARGIN;
      LiveRenderer.lastBar.stave = new Vex.Flow.Stave(
          LiveRenderer.bookmark.x,
          LiveRenderer.bookmark.y,
          LiveRenderer.STAVE_WIDTH);
      LiveRenderer.lastBar.stave.addClef('treble').setContext(LiveRenderer.context).draw();
    } else {
      LiveRenderer.lastBar.stave = new Vex.Flow.Stave(
          LiveRenderer.bookmark.x,
          LiveRenderer.bookmark.y,
          LiveRenderer.STAVE_WIDTH);
      LiveRenderer.lastBar.stave.setContext(LiveRenderer.context).draw();
    }
  },

  renderBar: function(bar) {
    Vex.Flow.Formatter.FormatAndDraw(LiveRenderer.context, bar.stave, bar.notes);
    bar.beams.forEach(function(beam) {
      beam.setContext(LiveRenderer.context).draw();
    });
  },

  getNotes: function(noteCode, duration, rest) {
    if (duration < LiveRenderer.BAR_DURATION / 16) {
      return [];
    }

    var noteType;
    for (noteType = 16; noteType > 1; noteType /= 2) {
      if (duration < LiveRenderer.BAR_DURATION / (noteType / 2)) {
        break;
      }
    }

    var remainingDuration = duration - LiveRenderer.BAR_DURATION / noteType;
    var notes = LiveRenderer.getNotes(noteCode, remainingDuration, rest);
    var note = new Vex.Flow.StaveNote({
      keys: [noteCode],
      duration: rest ? noteType + 'r' : noteType.toString()
    });

    if (noteType < 8) {
      notes.push(note);
    } else {
      if (notes.length == 0 || !(notes[notes.length - 1] instanceof Array)) {
        notes.push([]);
      }
      notes[notes.length - 1].push(note);
    }

    return notes;
  },

  durationFromNoteType: function(noteType) {
    var base = LiveRenderer.BAR_DURATION / 16;
    switch (noteType) {
      case '16':
      case '16r':
        return base;
      case '8':
      case '8r':
        return 2 * base;
      case '4':
      case '4r':
        return 4 * base;
      case '2':
      case '2r':
        return 8 * base;
      default:
        return 16 * base;
    }
  },

  remainingDuration: function(bar) {
    var duration = 0;
    bar.forEach(function(note) {
      duration += LiveRenderer.durationFromNoteType(note.duration);
    });
    return LiveRenderer.BAR_DURATION - duration;
  }
};
