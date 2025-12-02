# 3D Tic Tac Toe (Angular 19)

Key pieces:
- GameService (src/app/services/game.service.ts): pure game logic, board state, win detection, history, simple AI. Public methods: reset, setMode, makeMove, undo.
- Cube3DComponent (src/app/components/cube3d/cube3d.component.ts): CSS 3D cube with drag-to-rotate and collapse/expand during drag.
- CubeCellComponent: Focusable, accessible cell with keyboard selection (Enter/Space).
- SidebarComponent: Shows move history and provides controls (new game, undo, mode switch).
- Theme tokens: src/styles.css defines Ocean Professional colors using CSS variables.

Adjust spacing/sizing:
- Update --gap and --cell-size CSS variables in styles.css or via cube component binding.

Environment:
- Optional runtime NG_APP_LOG_LEVEL supported via global (window.NG_APP_LOG_LEVEL) to enable debug logs in GameService.
