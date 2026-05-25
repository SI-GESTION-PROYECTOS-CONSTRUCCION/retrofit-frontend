import { Component, ElementRef, Input, ViewChild, ViewEncapsulation } from '@angular/core';
import { gantt } from 'dhtmlx-gantt';
import { ProjectItemService } from '../../../../core/services/project-item.service';

@Component({
  selector: 'app-project-gantt-component',
  imports: [],
  templateUrl: './project-gantt-component.html',
  styleUrl: './project-gantt-component.css',
  encapsulation: ViewEncapsulation.None
})
export class ProjectGanttComponent {
  @ViewChild('ganttContainer', { static: true }) ganttContainer!: ElementRef;
  
  
  @Input() projectId!: number;
  @Input() projectStartDate!: string;

  constructor(private projectService: ProjectItemService) {}

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    // 1. Configuración básica
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.drag_links = true; 
    gantt.config.drag_progress = false; 
    gantt.config.columns = [
      {name: "code", label: "Item", width: "*", tree: true},
      {name: "text", label: "Partida", width: "*", tree: true},
      {name: "start_date", label: "Inicio", align: "center"},
      {name: "duration", label: "Días", align: "center"}
    ];

    gantt.attachEvent("onAfterTaskDrag", (id: string | number, mode: string, e: Event) => {
      this.saveTaskChanges(id);
    });

    // EVENTO 2: Cuando el usuario conecta una flecha (crea dependencia)
    gantt.attachEvent("onAfterLinkAdd", (id: string | number, link: any) => {
      // link.source es el padre, link.target es el hijo
      this.saveTaskChanges(link.target); 
    });

    // EVENTO 3: Cuando el usuario borra una flecha
    gantt.attachEvent("onAfterLinkDelete", (id: string | number, link: any) => {
      this.saveTaskChanges(link.target);
    });

    gantt.templates.task_class = (start: Date, end: Date, task: any) => {
      if (task.type === 'project' || gantt.hasChild(task.id)) {
        return 'mi-barra-padre';
      }
      return 'mi-barra-hija';
    };

    gantt.init(this.ganttContainer.nativeElement);

   
    this.loadGanttData();
  }


  saveTaskChanges(taskId: string | number): void {
    const task = gantt.getTask(taskId);
    
    // Convertimos la fecha de DHTMLX (Date) a texto "YYYY-MM-DD" para Java
    const formatFunc = gantt.date.date_to_str("%Y-%m-%d");
    
    let predecessorId: number | null = null;
    
    // Accedemos a la propiedad interna $target que guarda las flechas que ENTRAN
    const incomingLinks = (task as any).$target;
    
    if (incomingLinks && incomingLinks.length > 0) {
      // Tomamos la primera flecha entrante
      const linkId = incomingLinks[0]; 
      const linkObj = gantt.getLink(linkId);
      predecessorId = Number(linkObj.source); // El ID de la tarea padre
    }

    // Armamos el paquete para Java
    const updateDto = {
      startDate: formatFunc(task.start_date),
      endDate: formatFunc(task.end_date),
      predecessorId: predecessorId
    };

    // Llamamos al Backend pasándole el ID del Proyecto y el ID de la Partida
    this.projectService.updateGanttDates(this.projectId, Number(taskId), updateDto).subscribe({
      next: () => {
        console.log(`Partida ${taskId} actualizada correctamente en BD.`);
        this.loadGanttData(); 
      },
      error: (err) => {
        console.error('Error al guardar la partida', err);
        alert('Hubo un error al guardar las fechas');
      }
    });
  }

  loadGanttData(): void {
    if (!this.projectId) return;

    const canvasStart = new Date(this.projectStartDate + 'T00:00:00'); 
    canvasStart.setDate(canvasStart.getDate() - 0); 

    const canvasEnd = new Date(this.projectStartDate + 'T00:00:00');
    canvasEnd.setMonth(canvasEnd.getMonth() + 6); 

    gantt.config.start_date = canvasStart;
    gantt.config.end_date = canvasEnd;

    this.projectService.getGanttItems(this.projectId).subscribe({
      next: (backendItems) => {
        
        const tasks = backendItems.map(item => {
          
          // 1. Detectamos a la fuerza si esta partida tiene hijos en la lista
          const hasChildren = backendItems.some(child => child.parentId === item.id);
          
          // Es padre si el backend lo dice, o si tiene hijas adentro
          const isParent = item.type === 'project' || hasChildren;
          
          const taskObj: any = {
            id: item.id,
            code: item.code,
            text: item.name,
            progress: item.currentProgressPercentage / 100,
            parent: item.parentId,
            
            type: isParent ? 'project' : 'task',
            open: true
          };

          
          if (!isParent) {
            taskObj.start_date = item.startDate ? item.startDate : this.projectStartDate;
            taskObj.duration = item.baseDurationDays;
          }

          return taskObj;
        });

        // TRADUCTOR DE DEPENDENCIAS (Flechas)
        const links = backendItems
          .filter(item => item.predecessorId != null) 
          .map((item, index) => ({
            id: index + 1,
            source: item.predecessorId as number,
            target: item.id,            
            type: "0"                   
          }));

        // 3. Limpiar y dibujar
        gantt.clearAll();
        gantt.parse({ data: tasks, links: links });
      },
      error: (err) => console.error('Error cargando el Gantt', err)
    });
  }
}