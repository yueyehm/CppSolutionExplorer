import * as vscode from "vscode";
import * as path from "path";
import * as model from "../Model/project";
import * as event from "../Provider/view_provider_events"

export enum ItemType {
    TOP_LEVEL,
    PROJECT,
    FILE_GROUP,
    FILE
}

export abstract class ProjectViewItem extends vscode.TreeItem {

    private item_type_ : ItemType;
    private name_ : string;
    constructor(name: string = "", t: ItemType = ItemType.FILE, parent: ProjectViewItem | undefined) {
        super(name, t === ItemType.FILE ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
        this.name_ = name;
        this.item_type_ = t;
    }

    abstract GetChildren() : ProjectViewItem[];

    abstract GetParent() : ProjectViewItem | undefined;


    abstract GetModel() : model.AbsModel;


    GetItemType() {
        return this.item_type_;
    }


}

class FileLevelView extends ProjectViewItem {

    private file_ : model.File;
    private parent_ : ProjectViewItem;

    constructor(file: model.File, parent: ProjectViewItem) {
        super(file.GetName(), ItemType.FILE, parent);
        this.file_ = file;
        this.parent_ = parent;
        this.tooltip = file.GetFullName()
        this.label = file.GetName()
        this.id = file.GetFullName()
        this.command = {
            command: 'CppSolutionExplorer.OpenFile',
            arguments: [this],
            title: 'Open File'
        };
    
        var ext = path.extname(file.GetName())
        var icon_name = ""
        switch(ext) {
            case ".c":
                icon_name = "c.svg";
                break;
            case ".cc":
                icon_name = "cc.svg";
                break;
            case ".cpp":
            case ".cxx":
                icon_name = "cpp.svg";
                break;
            case ".h":
                icon_name = "h.svg";
                break;
            case ".hh":
            case ".hpp":
            case ".hxx":
                icon_name = "hpp.svg";
                break;
            case ".m":
            case ".mm":
            default:
                icon_name = "file.svg"
                break;
        }
        this.iconPath = path.join(__filename, "..", "..", "..", "icons", icon_name);
        event.TreeViewProviderProjectsEvents.all_opened_doc.set(file.GetFullName(), this)
    }

    GetChildren() : ProjectViewItem[] {
        return [];
    }

    GetParent() : ProjectViewItem | undefined{
        return this.parent_;
    }

    GetModel() {
        return this.file_
    }
}

class FileGroupLevelView extends ProjectViewItem {
    private group_ : model.FileGroup;
    private children_: ProjectViewItem[];
    private parent_ : ProjectViewItem;

    constructor(group: model.FileGroup, parent: ProjectViewItem) {
        super(group.GetName(), ItemType.FILE_GROUP, parent);
        this.group_ = group;
        this.parent_ = parent;
        var files = group.GetFiles();
        this.label = group.GetName()
        this.id = parent.GetModel().GetFullName() + "_" + group.GetName()
        this.children_ = [];
        for(var i = 0; i < files.length; i++) {
            this.children_.push(new FileLevelView(files[i], this));
        }
        this.iconPath = path.join(__filename, "..", "..", "..", "icons", "folder.svg");
    }

    GetChildren() : ProjectViewItem[] {
        return this.children_;
    }

    GetParent() : ProjectViewItem | undefined{
        return this.parent_;
    }

    GetModel() {
        return this.group_
    }
}

class ProjectLevelView extends ProjectViewItem {
    private project_ : model.Project;
    private children_: ProjectViewItem[];
    private parent_ : ProjectViewItem;

    constructor(project: model.Project, parent: ProjectViewItem) {
        super(project.GetName(), ItemType.PROJECT, parent);
        this.project_ = project;
        this.parent_ = parent;
        var groups = project.GetGroups();
        this.tooltip = project.GetFullName();
        this.label = project.GetName();
        this.id = project.GetFullName()
        this.children_ = [];
        for(var i = 0; i < groups.length; i++) {
            this.children_.push(new FileGroupLevelView(groups[i], this));
        }
        this.iconPath = path.join(__filename, "..", "..", "..", "icons", "vcxproj.svg");
    }

    GetChildren() : ProjectViewItem[] {
        return this.children_;
    }

    GetParent() : ProjectViewItem | undefined{
        return this.parent_;
    }

    GetModel() {
        return this.project_
    }
}

class TopLevelView extends ProjectViewItem {
    private children_: ProjectViewItem[];
    private empty_model_: model.Null

    constructor(name: string, projects: model.Project[]) {
        super(name, ItemType.TOP_LEVEL, undefined);
        this.empty_model_ = new model.Null()
        this.children_ = [];
        for(var i = 0; i < projects.length; i++) {
            this.children_.push(new ProjectLevelView(projects[i], this))
        }

        this.iconPath = path.join(__filename, "..", "..", "..", "icons", "sln.svg");
    }

    GetChildren() : ProjectViewItem[] {
        return this.children_;
    }

    GetParent() : ProjectViewItem | undefined{
        return undefined;
    }

    GetModel() {
        return this.empty_model_
    }
}

export function CreateTopLevel(name: string, children: model.Project[]) : ProjectViewItem {
    return new TopLevelView(name, children);
}